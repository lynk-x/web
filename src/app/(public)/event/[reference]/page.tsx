import { createClient } from '@/utils/supabase/server';
import EventDetailsView from '@/components/public/EventDetailsView';
import EventNotFoundView from '@/components/public/EventNotFoundView';
import { notFound } from 'next/navigation';
import { Event } from '@/types';
import { Metadata, ResolvingMetadata } from 'next';

export async function generateMetadata(
    { params }: { params: { reference: string } },
    parent: ResolvingMetadata
): Promise<Metadata> {
    const supabase = await createClient();
    const { reference } = await params;

    const { data: event } = await supabase
        .from('vw_events')
        .select('title, description, media, cover_image_url')
        .eq('reference', reference)
        .single();

    if (!event) return {};

    const previousImages = (await parent).openGraph?.images || [];
    const eventImage = (event as any).cover_image_url || (event.media as any)?.thumbnail;

    return {
        title: `${event.title} | Lynk-X`,
        description: event.description?.substring(0, 160) || "Experience this amazing event on Lynk-X.",
        openGraph: {
            title: event.title,
            description: event.description,
            images: eventImage ? [eventImage, ...previousImages] : previousImages,
        },
        twitter: {
            card: 'summary_large_image',
            title: event.title,
            description: event.description,
            images: eventImage ? [eventImage] : previousImages,
        },
    };
}

export default async function EventPage({ params }: { params: { reference: string } }) {
    const supabase = await createClient();
    const { reference } = await params;

    const { data: rawEvent, error } = await supabase
        .from('vw_events')
        .select('*')
        .eq('reference', reference)
        .single();

    if (error || !rawEvent) {
        return <EventNotFoundView />;
    }

    // Fetch ticket tiers (includes sold-out detection). tickets_available is
    // server-computed as capacity - tickets_sold - tickets_reserved, matching
    // what the checkout RPCs actually enforce — deriving it client-side from
    // tickets_sold alone (the old approach) ignored in-flight reservations and
    // could show availability that other buyers already have locked.
    const { data: ticketTiers } = await supabase
        .schema('api')
        .from('v1_ticket_tiers')
        .select('id, display_name, description, price, capacity, tickets_sold, tickets_available')
        .eq('event_id', rawEvent.id)
        .eq('is_hidden', false)
        .order('price', { ascending: true });

    // Fetch active disclaimers linked to this event via its tags.
    // Step 1: get tag_ids for this event
    const { data: eventTagRows } = await supabase
        .from('event_tags')
        .select('tag_id')
        .eq('event_id', rawEvent.id);

    const tagIds = eventTagRows?.map((r: any) => r.tag_id).filter(Boolean) || [];

    let disclaimers: any[] = [];
    if (tagIds.length > 0) {
        // Step 2: fetch approved, effective disclaimers matching those tags
        const { data: disclaimerRows } = await supabase
            .from('disclaimers')
            .select('id, title, content, is_active, effective_date')
            .in('tag_id', tagIds)
            .eq('is_active', true)
            .lte('effective_date', new Date().toISOString())
            .order('effective_date', { ascending: false });

        if (disclaimerRows && disclaimerRows.length > 0) {
            disclaimers = disclaimerRows.map((d: any) => ({
                id: d.id,
                title: d.title,
                content: d.content,
            }));
        }
    }

    // Determine if the event is sold out across all tiers
    const tiers = ticketTiers || [];
    const isSoldOut = tiers.length > 0 && tiers.every(
        (t: any) => t.capacity !== null && (t.tickets_available ?? 0) <= 0
    );

    const event: Event = {
        ...rawEvent,
        // Map UTC timestamps to the aliased names expected by the Event type
        start_datetime: rawEvent.starts_at,
        end_datetime: rawEvent.ends_at,
        timezone: rawEvent.timezone ?? undefined,
        organizer_name: rawEvent.organizer_name,
        category: rawEvent.category,
    };

    return (
        <EventDetailsView
            event={event}
            ticketTiers={tiers}
            disclaimers={disclaimers}
            isSoldOut={isSoldOut}
        />
    );
}
