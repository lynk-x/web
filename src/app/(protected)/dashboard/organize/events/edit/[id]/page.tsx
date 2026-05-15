"use client";
import { getErrorMessage } from '@/utils/error';

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
                // Fetch event and ticket tiers
                const { data: event, error: eventError } = await supabase
                    .from('events')
                    .select(`
                        id, created_at, title, description, category_id, is_online, is_private, 
                        location, starts_at, ends_at, media, timezone,
                        ticket_tiers (
                            id, display_name, price, capacity, description, sales_start_at, sales_end_at, max_per_user
                        ),
                        event_tags (
                            tags (id, name)
                        )
                    `)
                    .eq('id', eventId)
                    .eq('account_id', activeAccount.id)
                    .single();

                if (eventError) throw eventError;

                // Parse dates
                const startDt = new Date(event.starts_at);
                const endDt = new Date(event.ends_at);

                const formatDate = (d: Date) => d.toISOString().split('T')[0];
                const formatTime = (d: Date) => d.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

                const isPaid = event.ticket_tiers && event.ticket_tiers.length > 0;

                const mappedTickets: OrganizerEventTicket[] = (event.ticket_tiers || []).map((t: any) => {
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
                        saleStart: t.sales_start_at ? formatDateLocal(new Date(t.sales_start_at)) : '',
                        saleEnd: t.sales_end_at ? formatDateLocal(new Date(t.sales_end_at)) : '',
                        maxPerOrder: t.max_per_user?.toString() || ''
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
                    isPrivate: event.is_private,
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
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${activeAccount.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('events')
                    .upload(filePath, file, { cacheControl: '3600', upsert: true });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('events')
                    .getPublicUrl(filePath);

                uploadedThumbnailUrl = publicUrlData.publicUrl;
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
            const { error: rpcError } = await supabase.rpc('upsert_organizer_event', {
                p_account_id: activeAccount.id,
                p_event_id: eventId,
                p_created_at: eventCreatedAt,
                p_data: {
                    title: data.title,
                    description: data.description,
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
                    .from('tags')
                    .upsert(tagsToUpsert, { onConflict: 'slug' })
                    .select('id');

                if (tagUpsertError) throw tagUpsertError;

                if (resolvedTags) {
                    const eventTagsToInsert = resolvedTags.map(tag => ({
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
