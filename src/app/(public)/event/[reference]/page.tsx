import { createClient } from '@/utils/supabase/server';
import EventDetailsView from '@/components/public/EventDetailsView';
import EventNotFoundView from '@/components/public/EventNotFoundView';
import { notFound } from 'next/navigation';
import { Event } from '@/types';
import { Metadata, ResolvingMetadata } from 'next';
import { getEventImage } from '@/utils/eventImage';

export async function generateMetadata(
    { params }: { params: { reference: string } },
    parent: ResolvingMetadata
): Promise<Metadata> {
    const supabase = await createClient();
    const { reference } = await params;

    const { data: event } = await supabase
        .schema('api')
        .from('v1_event_detail')
        .select('title, description, media, cover_image_url')
        .eq('reference', reference)
        .single();

    if (!event) return {};

    const previousImages = (await parent).openGraph?.images || [];
    const eventImage = getEventImage(event);

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
        .schema('api')
        .from('v1_event_detail')
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
        .from('event_ticket_tiers')
        .select('id, display_name, description, price, capacity, tickets_sold, tickets_available, sales_start, sales_end')
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

    let tagNames: string[] = [];
    if (tagIds.length > 0) {
        const { data: tagRows } = await supabase
            .schema('api')
            .from('v1_tags')
            .select('id, name')
            .in('id', tagIds);

        tagNames = (tagRows || []).map((t: any) => t.name).filter(Boolean);
    }

    let disclaimers: any[] = [];
    if (tagIds.length > 0) {
        // Step 2: fetch approved, effective disclaimers matching those tags
        const { data: disclaimerRows } = await supabase
            .schema('api')
            .from('v1_disclaimers')
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

    // Determine if the event is sold out across all tiers — a tier whose
    // sales_end has passed reads as unavailable the same way a
    // capacity-exhausted tier does (see isTierSoldOut in EventDetailsView).
    const tiers = ticketTiers || [];
    const isSoldOut = tiers.length > 0 && tiers.every(
        (t: any) => ((t.capacity !== null && (t.tickets_available ?? 0) <= 0))
            || (t.sales_end && new Date(t.sales_end) < new Date())
    );

    // api.v1_event_detail has no ends_at cutoff (unlike vw_events), so an
    // already-ended event now resolves here instead of 404ing — but its
    // purchase/waitlist UI still needs to reflect that it's over.
    const isEventEnded = ['completed', 'cancelled'].includes(rawEvent.status)
        || (rawEvent.ends_at ? new Date(rawEvent.ends_at) < new Date() : false);

    const event: Event = {
        ...rawEvent,
        // Map UTC timestamps to the aliased names expected by the Event type
        start_datetime: rawEvent.starts_at,
        end_datetime: rawEvent.ends_at,
        timezone: rawEvent.timezone ?? undefined,
        organizer_name: rawEvent.organizer_name,
        category: rawEvent.category,
    };

    const eventImage = getEventImage(rawEvent);
    const eventSchema = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        'name': event.title,
        'description': event.description,
        'startDate': event.start_datetime,
        'endDate': event.end_datetime,
        'eventStatus': 'https://schema.org/EventScheduled',
        'eventAttendanceMode': (event as any).is_online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
        'location': (event as any).is_online ? {
            '@type': 'VirtualLocation',
            'url': `https://lynk-x.app/event/${reference}`,
        } : {
            '@type': 'Place',
            'name': (event.location as any)?.name || 'TBA',
            'address': {
                '@type': 'PostalAddress',
                'addressLocality': (event.location as any)?.city || (event.location as any)?.locality || '',
                'addressCountry': (event.location as any)?.country || '',
            }
        },
        'image': eventImage ? [eventImage] : [],
        'organizer': {
            '@type': 'Organization',
            'name': event.organizer_name || 'Lynk-X Organizer',
            'url': 'https://lynk-x.app',
        },
        'offers': tiers.map((t: any) => ({
            '@type': 'Offer',
            'name': t.display_name,
            'price': t.price,
            'priceCurrency': event.currency || 'KES',
            'availability': (t.tickets_available ?? 0) > 0 && !(t.sales_end && new Date(t.sales_end) < new Date())
                ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
            'url': `https://lynk-x.app/event/${reference}`,
        })),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
            />
            <EventDetailsView
                event={event}
                ticketTiers={tiers}
                disclaimers={disclaimers}
                isSoldOut={isSoldOut}
                isEventEnded={isEventEnded}
                tags={tagNames}
            />
        </>
    );
}
