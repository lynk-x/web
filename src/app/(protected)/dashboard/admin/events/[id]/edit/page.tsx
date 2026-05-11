"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useEffect, useState, use } from 'react';
import EventForm from '@/components/features/events/EventForm';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';

import type { OrganizerEventFormData, OrganizerEventTicket } from '@/types/organize';

export default function AdminEditEventPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: eventId } = use(params);

    const router = useRouter();
    const supabase = createClient();
    const { showToast } = useToast();

    const [initialData, setInitialData] = useState<OrganizerEventFormData | null>(null);
    const [eventCreatedAt, setEventCreatedAt] = useState<string | null>(null);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [eventCurrency, setEventCurrency] = useState<string>('KES');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEvent = async () => {
            if (!eventId) return;

            try {
                // Fetch event and ticket tiers (Admin can see all)
                const { data: event, error: eventError } = await supabase
                    .from('events')
                    .select(`
                        id, title, description, category_id, is_online, is_private, 
                        location, coordinates, starts_at, ends_at, media,
                        account_id, currency, created_at,
                        ticket_tiers (
                            id, display_name, price, capacity, description, sales_start, sales_end, max_per_order
                        )
                    `)
                    .eq('id', eventId)
                    .single();

                if (eventError) throw eventError;

                setAccountId(event.account_id);
                setEventCreatedAt(event.created_at);
                setEventCurrency(event.currency || 'KES');

                // Parse coordinates if they exist
                let coords: [number, number] | undefined;
                if (event.coordinates && typeof event.coordinates === 'string') {
                    // Expecting "POINT(lng lat)"
                    const match = event.coordinates.match(/POINT\((.+) (.+)\)/);
                    if (match) {
                        coords = [parseFloat(match[1]), parseFloat(match[2])];
                    }
                }

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
                    saleStart: t.sales_start ? formatDate(new Date(t.sales_start)) : '',
                    saleEnd: t.sales_end ? formatDate(new Date(t.sales_end)) : '',
                    maxPerOrder: t.max_per_order?.toString() || ''
                }));

                setInitialData({
                    title: event.title,
                    description: event.description,
                    category: event.category_id || '',
                    tags: [],
                    thumbnailUrl: (event.media as any)?.thumbnail || '',
                    isOnline: event.is_online,
                    location: (event.location as any)?.name || '',
                    coordinates: coords,
                    startDate: formatDate(startDt),
                    startTime: formatTime(startDt),
                    endDate: formatDate(endDt),
                    endTime: formatTime(endDt),
                    isPrivate: event.is_private,
                    isPaid,
                    tickets: mappedTickets,
                    currency: event.currency || 'KES'
                });

            } catch (error: unknown) {
                showToast("Failed to load event data. It may not exist.", "error");
                router.push('/dashboard/admin/events');
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvent();
    }, [eventId, router, showToast]);

    const handleEdit = async (data: OrganizerEventFormData, file?: File | null) => {
        if (!accountId || !eventCreatedAt) return;

        try {
            let uploadedThumbnailUrl = data.thumbnailUrl || null;

            // 1. Upload Thumbnail Image (If new file provided)
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `events/${accountId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(filePath, file, { cacheControl: '3600', upsert: true });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('media')
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
                    location: { name: data.location },
                    coordinates: data.coordinates ? `POINT(${data.coordinates[0]} ${data.coordinates[1]})` : null,
                    starts_at: startDateTime,
                    ends_at: endDateTime,
                    currency: data.currency,
                    media: { 
                        thumbnail: uploadedThumbnailUrl || (initialData?.thumbnailUrl)
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', eventId)
                .eq('created_at', eventCreatedAt);

            if (eventError) throw eventError;

            // 4. Update Tickets
            const incomingIds = data.tickets.map(t => t.id).filter(id => id);

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

            if (data.isPaid && data.tickets.length > 0) {
                const ticketsToUpsert = data.tickets.map((t) => ({
                    ...(t.id ? { id: t.id } : {}),
                    event_id: eventId,
                    event_created_at: eventCreatedAt,
                    display_name: t.display_name,
                    price: parseFloat(t.price),
                    capacity: parseInt(t.capacity),
                    max_per_order: t.maxPerOrder ? parseInt(t.maxPerOrder) : null,
                    sales_start: t.saleStart ? new Date(t.saleStart).toISOString() : startDateTime,
                    sales_end: t.saleEnd ? new Date(t.saleEnd).toISOString() : endDateTime,
                    description: t.description || null,
                    updated_at: new Date().toISOString()
                }));

                const { error: upsertError } = await supabase
                    .from('ticket_tiers')
                    .upsert(ticketsToUpsert);

                if (upsertError) throw upsertError;
            }

            showToast('Event updated successfully!', 'success');
            router.push('/dashboard/admin/events');

        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to update event. Please verify inputs.', 'error');
        }
    };

    if (isLoading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                <p>Loading event data...</p>
            </div>
        );
    }

    if (!initialData) return null;

    return (
        <EventForm
            initialData={initialData}
            isEditMode={true}
            pageTitle="Admin: Edit Event"
            submitBtnText="Save Changes"
            onSubmit={handleEdit}
        />
    );
}
