"use client";

import React, { useEffect, useState, use } from 'react';
import EventForm from '@/components/organize/EventForm';
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
    const [accountId, setAccountId] = useState<string | null>(null);
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
                        location_name, start_datetime, end_datetime, thumbnail_url,
                        account_id,
                        ticket_tiers (
                            id, name, price, quantity_total, description, sales_start_at, sales_end_at, max_per_user
                        )
                    `)
                    .eq('id', eventId)
                    .single();

                if (eventError) throw eventError;

                setAccountId(event.account_id);

                // Parse dates
                const startDt = new Date(event.start_datetime);
                const endDt = new Date(event.end_datetime);

                const formatDate = (d: Date) => d.toISOString().split('T')[0];
                const formatTime = (d: Date) => d.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

                const isPaid = event.ticket_tiers && event.ticket_tiers.length > 0;

                const mappedTickets: OrganizerEventTicket[] = (event.ticket_tiers || []).map((t: any) => ({
                    id: t.id,
                    name: t.name,
                    price: t.price.toString(),
                    quantity: t.quantity_total.toString(),
                    description: t.description || '',
                    saleStart: t.sales_start_at ? formatDate(new Date(t.sales_start_at)) : '',
                    saleEnd: t.sales_end_at ? formatDate(new Date(t.sales_end_at)) : '',
                    maxPerOrder: t.max_per_user?.toString() || ''
                }));

                setInitialData({
                    title: event.title,
                    description: event.description,
                    category: event.category_id || '',
                    tags: [],
                    thumbnailUrl: event.thumbnail_url || '',
                    isOnline: event.is_online,
                    location: event.location_name || '',
                    startDate: formatDate(startDt),
                    startTime: formatTime(startDt),
                    endDate: formatDate(endDt),
                    endTime: formatTime(endDt),
                    isPrivate: event.is_private,
                    isPaid,
                    limit: '',
                    tickets: mappedTickets
                });

            } catch (error: any) {
                console.error("Error fetching event:", error);
                showToast("Failed to load event data. It may not exist.", "error");
                router.push('/dashboard/admin/events');
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvent();
    }, [eventId, router, showToast]);

    const handleEdit = async (data: OrganizerEventFormData, file?: File | null) => {
        if (!accountId) return;

        try {
            let uploadedThumbnailUrl = data.thumbnailUrl || null;

            // 1. Upload Thumbnail Image (If new file provided)
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${accountId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('event_media')
                    .upload(filePath, file, { cacheControl: '3600', upsert: false });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('event_media')
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
                    location_name: data.location || null,
                    start_datetime: startDateTime,
                    end_datetime: endDateTime,
                    thumbnail_url: uploadedThumbnailUrl,
                })
                .eq('id', eventId);

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
                    name: t.name,
                    price: parseFloat(t.price),
                    quantity_total: parseInt(t.quantity),
                    max_per_user: t.maxPerOrder ? parseInt(t.maxPerOrder) : 5,
                    currency: 'KES',
                    sales_start_at: t.saleStart ? new Date(t.saleStart).toISOString() : startDateTime,
                    sales_end_at: t.saleEnd ? new Date(t.saleEnd).toISOString() : endDateTime,
                    description: t.description || null
                }));

                const { error: upsertError } = await supabase
                    .from('ticket_tiers')
                    .upsert(ticketsToUpsert);

                if (upsertError) throw upsertError;
            }

            showToast('Event updated successfully!', 'success');
            router.push('/dashboard/admin/events');

        } catch (error: any) {
            console.error("Error updating event:", error);
            showToast(error.message || 'Failed to update event. Please verify inputs.', 'error');
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
