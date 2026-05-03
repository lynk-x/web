"use client";
import { getErrorMessage } from '@/utils/error';

import EventForm from '@/components/features/events/EventForm';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import { useToast } from '@/components/ui/Toast';
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

            // 2. Parse DateTimes — convert to UTC relative to the event's selected timezone.
            // Bug 25 fix: previously used new Date(`${date}T${time}`) which interpreted the
            // string in the BROWSER's ambient timezone, wrong if the event is in a different zone.
            const toUtcIso = (date: string, time: string, tz?: string): string => {
                if (tz) {
                    try {
                        // Build a formatter that tells us the UTC offset for this zone at this moment
                        const dtStr = `${date}T${time}:00`;
                        // Parse as a local datetime in the target timezone via a trick:
                        // format the desired datetime string as if it were in the target tz
                        const zonedDate = new Date(
                            new Date(dtStr).toLocaleString('en-US', { timeZone: tz })
                        );
                        const localDate = new Date(dtStr);
                        const offset = localDate.getTime() - zonedDate.getTime();
                        return new Date(localDate.getTime() + offset).toISOString();
                    } catch {
                        // Fall through to naive parse if timezone string is invalid
                    }
                }
                // No timezone specified: interpret as the browser's local time (original behaviour)
                return new Date(`${date}T${time}`).toISOString();
            };

            const startDateTime = toUtcIso(data.startDate, data.startTime, data.timezone);
            const endDateTime = toUtcIso(data.endDate, data.endTime, data.timezone);

            // 3. Insert Event Record
            const { data: newEvent, error: eventError } = await supabase
                .from('events')
                .insert({
                    account_id: activeAccount.id,
                    title: data.title,
                    description: data.description,
                    category_id: data.category,
                    currency: data.currency,
                    is_online: data.isOnline,
                    is_private: data.isPrivate,
                    // Write location into the JSONB location column
                    location: data.location ? { name: data.location } : null,
                    starts_at: startDateTime,
                    ends_at: endDateTime,
                    // Write thumbnail into the JSONB media column
                    ...(uploadedThumbnailUrl ? { media: { thumbnail: uploadedThumbnailUrl } } : {}),
                    timezone: data.timezone || null,
                    status: data.status || 'published'
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
                    max_per_order: t.maxPerOrder ? parseInt(t.maxPerOrder) : 5,
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

                // Fetch existing tags first to avoid upsert RLS issues
                const { data: existingTags, error: tagFetchError } = await supabase
                    .from('tags')
                    .select('id, slug')
                    .in('slug', tagsToUpsert.map(t => t.slug));

                if (tagFetchError) throw tagFetchError;

                let resolvedTags = existingTags || [];
                const existingSlugs = new Set(resolvedTags.map(t => t.slug));
                const newTagsToCreate = tagsToUpsert.filter(t => !existingSlugs.has(t.slug));

                // Attempt to create new tags if any, but don't crash if RLS blocks it
                if (newTagsToCreate.length > 0) {
                    const { data: createdTags } = await supabase
                        .from('tags')
                        .insert(newTagsToCreate)
                        .select('id, slug');
                    
                    if (createdTags) {
                        resolvedTags = [...resolvedTags, ...createdTags];
                    }
                }

                if (resolvedTags.length > 0) {
                    const eventTagsToInsert = resolvedTags.map(tag => ({
                        event_id: newEvent.id,
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
