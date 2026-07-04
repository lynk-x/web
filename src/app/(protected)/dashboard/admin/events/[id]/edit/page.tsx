"use client";
import { getErrorMessage } from '@/utils/error';
import { generateEventEmbedding } from '@/utils/embedding';

import { useEffect, useState, use, useMemo } from 'react';
import EventForm from '@/components/features/events/EventForm';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import { useToast } from '@/components/ui/Toast';

import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import Spinner from '@/components/shared/Spinner';
import SubPageHeader from '@/components/shared/SubPageHeader';
import { AccountSearchInput } from '@/components/shared/AccountSearchInput';
import type { OrganizerEventFormData, OrganizerEventTicket } from '@/types/organize';

export default function AdminEditEventPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: eventId } = use(params);

    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();

    const [initialData, setInitialData] = useState<OrganizerEventFormData | null>(null);
    const [eventCreatedAt, setEventCreatedAt] = useState<string | null>(null);
    const [eventAccountId, setEventAccountId] = useState<string | null>(null);
    const [eventCurrency, setEventCurrency] = useState<string>('KES');
    const [isLoading, setIsLoading] = useState(true);

    const [accountId, setAccountId] = useState<string>('');

    useEffect(() => {
        const fetchEvent = async () => {
            if (!eventId) return;

            try {
                // Fetch event
                const { data: event, error: eventError } = await supabase
                    .from('events')
                    .select(`
                        id, title, description, category_id, is_online, is_private,
                        location, coordinates, starts_at, ends_at, media,
                        account_id, currency, created_at
                    `)
                    .eq('id', eventId)
                    .single();

                if (eventError) throw eventError;

                // Fetch ticket tiers separately
                const { data: tiers } = await supabase
                    .from('ticket_tiers')
                    .select('id, display_name, price, capacity, description, sales_start, sales_end, max_per_order')
                    .eq('event_id', eventId);

                if (eventError) throw eventError;

                setEventAccountId(event.account_id);
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

                const isPaid = tiers ? tiers.length > 0 : false;

                const mappedTickets: OrganizerEventTicket[] = (tiers || []).map((t: any) => ({
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
                    isPrivate: event.is_private ?? false,
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
        const resolvedAccountId = accountId || eventAccountId;
        if (!resolvedAccountId || !eventCreatedAt) return;

        try {
            let uploadedThumbnailUrl = data.thumbnailUrl || null;

            // 1. Upload Thumbnail Image (If new file provided)
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

            // 3. Update Event Record
            const { error: eventError } = await supabase
                .from('events')
                .update({
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
                    currency: data.currency,
                    media: {
                        thumbnail: uploadedThumbnailUrl || (initialData?.thumbnailUrl)
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', eventId)
                .eq('created_at', eventCreatedAt);

            if (eventError) throw eventError;

            // Update Event Embedding (Client-side vector sync)
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
                const ticketsToInsert = [];
                
                for (const t of data.tickets) {
                    const ticketData = {
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
                    };

                    if (t.id) {
                            const { error: updateError } = await supabase
                                .from('ticket_tiers')
                                .update(ticketData)
                                .eq('id', t.id);
                        if (updateError) throw updateError;
                    } else {
                        ticketsToInsert.push(ticketData);
                    }
                }

                if (ticketsToInsert.length > 0) {
                        const { error: insertError } = await supabase
                            .from('ticket_tiers')
                            .insert(ticketsToInsert);
                    if (insertError) throw insertError;
                }
            }

            showToast('Event updated successfully!', 'success');
            router.push('/dashboard/admin/events');

        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to update event. Please verify inputs.', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className={adminStyles.loadingContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                <Spinner />
            </div>
        );
    }

    if (!initialData) return null;

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Admin: Edit Event"
                subtitle="Change event details, timing or ticketing configuration."
                backLabel="Back to Events"
            />

            {/* Account Selector — admin can reassign event ownership */}
            <AccountSearchInput
                value={accountId}
                onChange={setAccountId}
                label="Owning Account"
                placeholder="Search accounts by name or reference…"
                countryCode={activeAccount?.country_code || null}
            />

            <div className={adminStyles.pageCard}>
                <EventForm
                    initialData={initialData}
                    isEditMode={true}
                    submitBtnText="Save Changes"
                    onSubmit={handleEdit}
                />
            </div>
        </div>
    );
}
