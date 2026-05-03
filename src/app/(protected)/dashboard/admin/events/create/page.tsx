"use client";
import { getErrorMessage } from '@/utils/error';

import EventForm from '@/components/features/events/EventForm';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import { useToast } from '@/components/ui/Toast';

import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import SubPageHeader from '@/components/shared/SubPageHeader';

import type { OrganizerEventFormData } from '@/types/organize';

export default function AdminCreateEventPage() {
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
                    location: data.location ? { name: data.location } : null,
                    starts_at: startDateTime,
                    ends_at: endDateTime,
                    ...(uploadedThumbnailUrl ? { media: { thumbnail: uploadedThumbnailUrl } } : {}),
                    status: 'published'
                })
                .select('id')
                .single();

            if (eventError) throw eventError;

            // 4. Insert Tickets (if Paid)
            if (data.isPaid && data.tickets.length > 0 && newEvent) {
                const ticketsToInsert = data.tickets.map((t) => ({
                    event_id: newEvent.id,
                    display_name: t.display_name,
                    price: parseFloat(t.price),
                    capacity: parseInt(t.capacity),
                    max_per_user: t.maxPerOrder ? parseInt(t.maxPerOrder) : 5,
                    sales_start_at: t.saleStart ? new Date(t.saleStart).toISOString() : startDateTime,
                    sales_end_at: t.saleEnd ? new Date(t.saleEnd).toISOString() : endDateTime,
                }));

                const { error: ticketError } = await supabase
                    .from('ticket_tiers')
                    .insert(ticketsToInsert);

                if (ticketError) throw ticketError;
            }

            // 5. Link Tags
            if (data.tags.length > 0 && newEvent) {
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
                        event_id: newEvent.id,
                        tag_id: tag.id
                    }));

                    const { error: eventTagError } = await supabase
                        .from('event_tags')
                        .insert(eventTagsToInsert);

                    if (eventTagError) showToast('Event created but some tags failed to link.', 'warning');
                }
            }

            // Success Cleanup
            localStorage.removeItem('event_draft');
            showToast('Event created successfully!', 'success');
            router.push('/dashboard/admin/events');

        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to create event. Please verify inputs.', 'error');
        }
    };

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Admin: Create New Event"
                subtitle="Add a platform-level event or override existing listings."
                backLabel="Back to Events"
            />
            <div className={adminStyles.pageCard}>
                <EventForm
                    pageTitle="Event Details"
                    submitBtnText="Publish Event"
                    onSubmit={handleCreate}
                />
            </div>
        </div>
    );
}
