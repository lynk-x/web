"use client";

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
                        id, title, description, category_id, is_online, is_private, 
                        location, starts_at, ends_at, media,
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

                const mappedTickets: OrganizerEventTicket[] = (event.ticket_tiers || []).map((t: any) => ({
                    id: t.id,
                    display_name: t.display_name,
                    price: t.price.toString(),
                    capacity: t.capacity.toString(),
                    description: t.description || '',
                    saleStart: t.sales_start_at ? formatDate(new Date(t.sales_start_at)) : '',
                    saleEnd: t.sales_end_at ? formatDate(new Date(t.sales_end_at)) : '',
                    maxPerOrder: t.max_per_user?.toString() || ''
                }));

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
                    tickets: mappedTickets
                });

            } catch (error: any) {
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

            // 2. Parse DateTimes
            const startDateTime = new Date(`${data.startDate}T${data.startTime}`).toISOString();
            const endDateTime = new Date(`${data.endDate}T${data.endTime}`).toISOString();

            // 3. Update Event Record
            const { error: eventError } = await supabase
                .from('events')
                .update({
                    title: data.title,
                    description: data.description,
                    category_id: data.category,
                    is_online: data.isOnline,
                    is_private: data.isPrivate,
                    // Write location into the JSONB location column
                    location: data.location ? { name: data.location } : null,
                    starts_at: startDateTime,
                    ends_at: endDateTime,
                    // Write thumbnail into the JSONB media column
                    ...(uploadedThumbnailUrl ? { media: { thumbnail: uploadedThumbnailUrl } } : {}),
                    ...(data.status ? { status: data.status } : {}),
                })
                .eq('id', eventId)
                .eq('account_id', activeAccount.id);

            if (eventError) throw eventError;

            // 4. Update Tickets
            // Delete removed tickets
            const incomingIds = data.tickets.map(t => t.id).filter(id => id); // Get all passed IDs

            const { data: existingTickets } = await supabase
                .from('ticket_tiers')
                .select('id')
                .eq('event_id', eventId);

            const existingIds = existingTickets?.map(t => t.id) || [];
            const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));

            if (idsToDelete.length > 0) {
                const { error: deleteError } = await supabase
                    .from('ticket_tiers')
                    .delete()
                    .in('id', idsToDelete);

                if (deleteError) {
                    throw new Error("Cannot delete ticket tiers that already have sales attached to them.");
                }
            }

            // Upsert remaining/new tickets
            if (data.isPaid && data.tickets.length > 0) {
                const ticketsToUpsert = data.tickets.map((t) => ({
                    ...(t.id ? { id: t.id } : {}), // only spread ID if it exists
                    event_id: eventId,
                    display_name: t.display_name,
                    price: parseFloat(t.price),
                    capacity: parseInt(t.capacity),
                    max_per_user: t.maxPerOrder ? parseInt(t.maxPerOrder) : 5,
                    sales_start_at: t.saleStart ? new Date(t.saleStart).toISOString() : startDateTime,
                    sales_end_at: t.saleEnd ? new Date(t.saleEnd).toISOString() : endDateTime,
                    description: t.description || null
                }));

                const { error: upsertError } = await supabase
                    .from('ticket_tiers')
                    .upsert(ticketsToUpsert);

                if (upsertError) throw upsertError;
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

        } catch (error: any) {
            console.error("Error updating event:", error);
            showToast(error.message || 'Failed to update event. Please verify inputs.', 'error');
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
