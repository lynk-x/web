"use client";

import EventForm from '@/components/organize/EventForm';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import { useToast } from '@/components/ui/Toast';

import type { OrganizerEventFormData } from '@/types/organize';

export default function CreateEventPage() {
    const router = useRouter();
    const supabase = createClient();
    const { activeAccount } = useOrganization();
    const { showToast } = useToast();

    const handleCreate = async (data: OrganizerEventFormData, file?: File | null) => {
        if (!activeAccount) {
            showToast('You must select an organization first.', 'error');
            return;
        }

        try {
            let uploadedThumbnailUrl = data.thumbnailUrl || null;

            // 1. Upload Thumbnail Image
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${activeAccount.id}/${fileName}`; // Organize by account in bucket

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

            // 3. Insert Event Record
            const { data: newEvent, error: eventError } = await supabase
                .from('events')
                .insert({
                    account_id: activeAccount.id,
                    title: data.title,
                    description: data.description,
                    category_id: data.category,
                    is_online: data.isOnline,
                    is_private: data.isPrivate,
                    location_name: data.location || null,
                    start_datetime: startDateTime,
                    end_datetime: endDateTime,
                    thumbnail_url: uploadedThumbnailUrl,
                    status: 'published' // Default to published for MVP, usually 'draft' first
                })
                .select('id')
                .single();

            if (eventError) throw eventError;

            // 4. Insert Tickets (if Paid)
            if (data.isPaid && data.tickets.length > 0 && newEvent) {
                const ticketsToInsert = data.tickets.map((t) => ({
                    event_id: newEvent.id,
                    name: t.name,
                    price: parseFloat(t.price),
                    quantity_total: parseInt(t.quantity),
                    max_per_user: t.maxPerOrder ? parseInt(t.maxPerOrder) : 5,
                    currency: 'KES', // Defaulting for MVP
                    sales_start_at: t.saleStart ? new Date(t.saleStart).toISOString() : startDateTime,
                    sales_end_at: t.saleEnd ? new Date(t.saleEnd).toISOString() : endDateTime,
                }));

                const { error: ticketError } = await supabase
                    .from('ticket_tiers')
                    .insert(ticketsToInsert);

                if (ticketError) throw ticketError;
            }

            // Success Cleanup
            localStorage.removeItem('event_draft'); // Clear draft on success
            showToast('Event created successfully!', 'success');
            router.push('/dashboard/organize/events');

        } catch (error: any) {
            console.error("Error creating event:", error);
            showToast(error.message || 'Failed to create event. Please verify inputs.', 'error');
        }
    };

    return (
        <EventForm
            pageTitle="Create New Event"
            submitBtnText="Publish Event"
            onSubmit={handleCreate}
        />
    );
}
