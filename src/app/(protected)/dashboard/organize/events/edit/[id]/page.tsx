"use client";
import { getErrorMessage } from '@/utils/error';
import { generateEventEmbedding } from '@/utils/embedding';

import React, { useEffect, useState } from 'react';
import EventForm from '@/components/features/events/EventForm';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import { useToast } from '@/components/ui/Toast';

import type { OrganizerEventFormData, OrganizerEventTicket } from '@/types/organize';

export default function EditEventPage() {
    const params = useParams();
    const eventId = params.id as string;

    const router = useRouter();
    const supabase = createClient();
    const { activeAccount } = useOrganization();
    const { showToast } = useToast();

    const [initialData, setInitialData] = useState<OrganizerEventFormData | null>(null);
    const [eventCreatedAt, setEventCreatedAt] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEvent = async () => {
            if (!eventId) return;
            if (!activeAccount) {
                setIsLoading(false);
                return;
            }

            try {
                // Fetch event
                const { data: event, error: eventError } = await supabase
                    .from('events')
                    .select(`
                        id, created_at, title, description, category_id, is_online, is_private, 
                        location, starts_at, ends_at, media, timezone,
                        event_tags (
                            tags (id, name)
                        )
                    `)
                    .eq('id', eventId)
                    .eq('account_id', activeAccount.id)
                    .single();

                if (eventError) throw eventError;

                // Fetch ticket tiers separately
                const { data: tiers } = await supabase
                    .from('ticket_tiers')
                    .select('id, display_name, price, capacity, description, sales_start, sales_end, max_per_order')
                    .eq('event_id', eventId);

                if (eventError) throw eventError;

                // Parse dates
                const startDt = new Date(event.starts_at);
                const endDt = new Date(event.ends_at);

                const formatDate = (d: Date) => d.toISOString().split('T')[0];
                const formatTime = (d: Date) => d.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

                const isPaid = tiers ? tiers.length > 0 : false;

                const mappedTickets: OrganizerEventTicket[] = (tiers || []).map((t: any) => {
                    const tz = event.timezone || 'UTC';
                    const formatDateLocal = (d: Date) => {
                        const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d).split('-');
                        return `${parts[0]}-${parts[1]}-${parts[2]}`;
                    };
                    return {
                        id: t.id,
                        display_name: t.display_name,
                        price: t.price.toString(),
                        capacity: t.capacity.toString(),
                        description: t.description || '',
                        saleStart: t.sales_start ? formatDateLocal(new Date(t.sales_start)) : '',
                        saleEnd: t.sales_end ? formatDateLocal(new Date(t.sales_end)) : '',
                        maxPerOrder: t.max_per_order?.toString() || ''
                    };
                });

                const mappedTags = (event.event_tags || []).map((et: any) => et.tags?.name).filter(Boolean);

                setInitialData({
                    title: event.title,
                    description: event.description,
                    category: event.category_id || '',
                    tags: mappedTags,
                    thumbnailUrl: (event.media as any)?.thumbnail || '',
                    isOnline: event.is_online,
                    location: (event.location as any)?.name || '',
                    startDate: formatDate(startDt),
                    startTime: formatTime(startDt),
                    endDate: formatDate(endDt),
                    endTime: formatTime(endDt),
                    isPrivate: event.is_private ?? false,
                    isPaid,
                    currency: 'KES',
                    tickets: mappedTickets,
                    timezone: event.timezone || 'UTC'
                });
                setEventCreatedAt(event.created_at);

            } catch (error: unknown) {
                console.error("Error fetching event:", error);
                showToast("Failed to load event data. It may not exist or belong to your organization.", "error");
                router.push('/dashboard/organize/events');
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvent();
    }, [activeAccount, eventId, router, showToast, supabase]);

    const handleEdit = async (data: OrganizerEventFormData, file?: File | null) => {
        if (!activeAccount) {
            showToast('You must select an organization first.', 'error');
            return;
        }

        try {
            let uploadedThumbnailUrl = data.thumbnailUrl || null;

            // 1. Upload Thumbnail Image (If new file provided)
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${activeAccount.id}_${Date.now()}.${fileExt}`;

                const { data: signData, error: signError } = await supabase.functions.invoke('media-signer', {
                    body: {
                        action: 'upload',
                        folder: 'events',
                        filename: fileName,
                        contentType: file.type,
                        mediaType: 'image',
                    }
                });

                if (signError || !signData?.uploadUrl) {
                    throw new Error(signError?.message || 'Failed to get upload URL');
                }

                const putResponse = await fetch(signData.uploadUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': file.type,
                    },
                    body: file,
                });

                if (!putResponse.ok) {
                    throw new Error('Failed to upload thumbnail to R2');
                }

                uploadedThumbnailUrl = signData.fileUrl;
            }

            // 2. Parse DateTimes — convert to UTC relative to the event's selected timezone.
            const toUtcIso = (date: string, time: string, tz?: string): string => {
                if (tz) {
                    try {
                        const dtStr = `${date}T${time}:00`;
                        const zonedDate = new Date(
                            new Date(dtStr).toLocaleString('en-US', { timeZone: tz })
                        );
                        const localDate = new Date(dtStr);
                        const offset = localDate.getTime() - zonedDate.getTime();
                        return new Date(localDate.getTime() + offset).toISOString();
                    } catch {
                        // Fall through
                    }
                }
                return new Date(`${date}T${time}`).toISOString();
            };

            const startDateTime = toUtcIso(data.startDate, data.startTime, data.timezone);
            const endDateTime = toUtcIso(data.endDate, data.endTime, data.timezone);

            // 3. Upsert Event & Tiers via Atomic RPC
            const { error: rpcError } = await supabase.schema('api').rpc('upsert_organizer_event', {
                p_account_id: activeAccount.id,
                p_event_id: eventId,
                p_created_at: eventCreatedAt,
                p_data: {
                    title: data.title,
                    description: data.description,
                    category_id: data.category || null,
                    starts_at: startDateTime,
                    ends_at: endDateTime,
                    timezone: data.timezone || 'UTC',
                    location: data.location ? { name: data.location } : null,
                    media: uploadedThumbnailUrl ? { thumbnail: uploadedThumbnailUrl } : {},
                    currency: 'KES', // Defaulting to KES as per initial state
                    is_private: data.isPrivate,
                    status: data.status || undefined
                },
                p_tiers: data.tickets.map(t => ({
                    id: t.id || undefined,
                    name: t.display_name,
                    price: data.isPaid ? parseFloat(t.price || '0') : 0,
                    capacity: parseInt(t.capacity || '0'),
                    sales_start: t.saleStart ? toUtcIso(t.saleStart, '00:00', data.timezone) : startDateTime,
                    sales_end: t.saleEnd ? toUtcIso(t.saleEnd, '23:59', data.timezone) : endDateTime,
                    description: t.description || null,
                    max_per_order: t.maxPerOrder ? parseInt(t.maxPerOrder) : 5
                }))
            });

            if (rpcError) throw rpcError;

            // 4. Update Event Embedding (Client-side vector sync)
            try {
                let categoryName: string | undefined;
                if (data.category) {
                    const { data: catData } = await supabase
                        .from('event_categories')
                        .select('display_name')
                        .eq('id', data.category)
                        .maybeSingle();
                    if (catData) {
                        categoryName = catData.display_name;
                    }
                }

                const vector = await generateEventEmbedding(
                    data.title,
                    data.description,
                    data.location || undefined,
                    categoryName
                );
                if (vector && vector.length === 384) {
                    const { error: embedError } = await supabase
                        .from('events')
                        .update({ embedding: vector })
                        .eq('id', eventId);
                    if (embedError) {
                        console.error('Failed to update event embedding in database:', embedError);
                    }
                }
            } catch (err) {
                console.error('Failed to generate client embedding for event edit:', err);
            }

            // 5. Update Tags
            // Delete current links
            await supabase.from('event_tags').delete().eq('event_id', eventId);

            if (data.tags.length > 0) {
                const tagsToUpsert = data.tags.map(tag => ({
                    name: tag,
                    slug: tag.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                    is_official: false
                }));

                const { data: resolvedTags, error: tagUpsertError } = await supabase
                    .schema('api').rpc('resolve_tags', { p_tags: tagsToUpsert });

                if (tagUpsertError) throw tagUpsertError;

                if (resolvedTags && Array.isArray(resolvedTags)) {
                    const eventTagsToInsert = resolvedTags.map((tag: any) => ({
                        event_id: eventId,
                        tag_id: tag.id
                    }));

                    const { error: eventTagError } = await supabase
                        .from('event_tags')
                        .insert(eventTagsToInsert);

                    if (eventTagError) console.error("Warning: Tag linking failed", eventTagError);
                }
            }

            // Success
            showToast('Event updated successfully!', 'success');
            router.push('/dashboard/organize/events');

        } catch (error: unknown) {
            console.error("Error updating event:", error);
            showToast(getErrorMessage(error) || 'Failed to update event. Please verify inputs.', 'error');
        }
    };

    if (isLoading && !activeAccount) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                <p>Loading event data...</p>
            </div>
        );
    }

    if (!initialData) {
        return null; // or empty state
    }

    return (
        <EventForm
            initialData={initialData}
            isEditMode={true}
            pageTitle="Edit Event"
            submitBtnText="Save Changes"
            onSubmit={handleEdit}
        />
    );
}
