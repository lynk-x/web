"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useMemo } from 'react';
import EventForm from '@/components/features/events/EventForm';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import { useToast } from '@/components/ui/Toast';

import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import SubPageHeader from '@/components/shared/SubPageHeader';
import { AccountSearchInput } from '@/components/shared/AccountSearchInput';

import type { OrganizerEventFormData } from '@/types/organize';

export default function AdminCreateEventPage() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { activeAccount } = useOrganization();
    const { showToast } = useToast();

    const [accountId, setAccountId] = useState('');

    const handleCreate = async (data: OrganizerEventFormData, file?: File | null) => {
        const resolvedAccountId = accountId || activeAccount?.id;
        if (!resolvedAccountId) {
            showToast('You must select an organization first.', 'error');
            return;
        }

        try {
            let uploadedThumbnailUrl = data.thumbnailUrl || null;

            // 1. Upload Thumbnail Image
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${resolvedAccountId}_${Date.now()}.${fileExt}`;

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

            // 2. Parse DateTimes
            const startDateTime = new Date(`${data.startDate}T${data.startTime}`).toISOString();
            const endDateTime = new Date(`${data.endDate}T${data.endTime}`).toISOString();

            // 3. Insert Event Record
            const { data: newEvent, error: eventError } = await supabase
                .from('events')
                .insert({
                    account_id: resolvedAccountId,
                    title: data.title,
                    description: data.description,
                    category_id: data.category,
                    is_online: data.isOnline,
                    is_private: data.isPrivate,
                    location: { name: data.location },
                    coordinates: data.coordinates ? `POINT(${data.coordinates[0]} ${data.coordinates[1]})` : null,
                    starts_at: startDateTime,
                    ends_at: endDateTime,
                    currency: data.currency || 'KES',
                    media: {
                        thumbnail: uploadedThumbnailUrl
                    },
                    status: 'published'
                })
                .select('id, created_at')
                .single();

            if (eventError) throw eventError;

            // 4. Insert Tickets (if Paid)
            if (data.isPaid && data.tickets.length > 0 && newEvent) {
                const ticketsToInsert = data.tickets.map((t) => ({
                    event_id: newEvent.id,
                    event_created_at: newEvent.created_at,
                    display_name: t.display_name,
                    price: parseFloat(t.price),
                    capacity: parseInt(t.capacity),
                    max_per_order: t.maxPerOrder ? parseInt(t.maxPerOrder) : null,
                    sales_start: t.saleStart ? new Date(t.saleStart).toISOString() : startDateTime,
                    sales_end: t.saleEnd ? new Date(t.saleEnd).toISOString() : endDateTime,
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
                    .schema('api').rpc('resolve_tags', { p_tags: tagsToUpsert });

                if (tagUpsertError) throw tagUpsertError;

                if (resolvedTags && Array.isArray(resolvedTags)) {
                    const eventTagsToInsert = resolvedTags.map((tag: any) => ({
                        event_id: newEvent.id,
                        event_created_at: newEvent.created_at,
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

            {/* Account Selector — admin chooses owning account */}
            <AccountSearchInput
                value={accountId}
                onChange={setAccountId}
                label="Owning Account"
                placeholder="Search accounts by name or reference…"
                countryCode={activeAccount?.country_code || null}
            />

            <div className={adminStyles.pageCard}>
                <EventForm
                    submitBtnText="Publish Event"
                    onSubmit={handleCreate}
                />
            </div>
        </div>
    );
}
