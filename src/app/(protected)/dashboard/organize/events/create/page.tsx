"use client";
import { getErrorMessage } from '@/utils/error';

import EventForm from '@/components/features/events/EventForm';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import { useToast } from '@/components/ui/Toast';
import { toUtcIso } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';

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
            const startDateTime = toUtcIso(data.startDate, data.startTime, data.timezone);
            const endDateTime = toUtcIso(data.endDate, data.endTime, data.timezone);

            // 3. Upsert Event & Tiers via Atomic RPC
            const { data: rpcResult, error: rpcError } = await supabase.schema('api').rpc('upsert_organizer_event', {
                p_account_id: activeAccount.id,
                p_event_id: null, // New event
                p_created_at: null,
                p_data: {
                    title: data.title,
                    description: data.description,
                    category_id: data.category || null,
                    starts_at: startDateTime,
                    ends_at: endDateTime,
                    timezone: data.timezone || null,
                    location: data.location ? { name: data.location } : null,
                    media: uploadedThumbnailUrl ? { thumbnail: uploadedThumbnailUrl } : {},
                    currency: data.currency,
                    is_private: data.isPrivate,
                    status: data.status || 'published'
                },
                p_tiers: data.tickets.map(t => ({
                    name: t.display_name,
                    price: data.isPaid ? parseFloat(t.price || '0') : 0,
                    capacity: parseInt(t.capacity || '0'),
                    sales_start: t.saleStart ? new Date(t.saleStart).toISOString() : startDateTime,
                    sales_end: t.saleEnd ? new Date(t.saleEnd).toISOString() : endDateTime,
                    max_per_order: t.maxPerOrder ? parseInt(t.maxPerOrder) : 5
                }))
            });

            if (rpcError) throw rpcError;
            const newEventId = rpcResult.event_id;
            const newEventCreatedAt = rpcResult.created_at;

            // 5. Link Tags
            if (data.tags.length > 0 && newEventId) {
                const tagsToResolve = data.tags.map(tag => ({
                    name: tag,
                    slug: tag.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                    is_official: false
                }));

                // Find-or-create by slug happens server-side (identity.tags is
                // admin-insert-only under RLS; this RPC is the sanctioned path
                // for organizers to mint unofficial, user-submitted tags).
                const { data: resolvedTags, error: resolveError } = await supabase
                    .schema('api')
                    .rpc('resolve_tags', { p_tags: tagsToResolve });

                if (resolveError) throw resolveError;

                if (resolvedTags && resolvedTags.length > 0) {
                    const eventTagsToInsert = resolvedTags.map((tag: { id: string }) => ({
                        event_id: newEventId,
                        event_created_at: newEventCreatedAt,
                        tag_id: tag.id
                    }));

                    const { error: eventTagError } = await supabase
                        .from('event_tags')
                        .insert(eventTagsToInsert);

                    if (eventTagError) console.error("Error linking tags:", eventTagError);
                }
            }

            // Success Cleanup
            localStorage.removeItem('event_draft'); // Clear draft on success
            showToast('Event created successfully!', 'success');
            router.push('/dashboard/organize/events');

        } catch (error: unknown) {
            console.error("Error creating event:", error);
            showToast(getErrorMessage(error) || 'Failed to create event. Please verify inputs.', 'error');
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
