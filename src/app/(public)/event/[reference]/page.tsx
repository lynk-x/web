import { createPublicClient } from '@/utils/supabase/public';
import EventDetailsView from '@/components/public/EventDetailsView';
import { notFound } from 'next/navigation';
import { Event } from '@/types';
import { Metadata } from 'next';
import { getEventImage } from '@/utils/eventImage';
import { slugifyCategory } from '@/utils/categories';

interface EventMetadataRow {
    title: string;
    description?: string | null;
    media?: Record<string, unknown> | null;
    cover_image_url?: string | null;
}

interface TicketTierRow {
    id: string;
    display_name: string;
    description?: string | null;
    price: number;
    capacity: number | null;
    tickets_sold?: number | null;
    tickets_available: number | null;
    sales_start?: string | null;
    sales_end?: string | null;
}

interface DisclaimerRow {
    id: string;
    title: string;
    content: string;
}

export const revalidate = 60;

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

function buildNotFoundMetadata(): Metadata {
    return {
        title: 'Event Not Found',
        description: 'This event could not be found on Lynk-X.',
        robots: { index: false, follow: false },
    };
}

/**
 * Generates dynamic event metadata, self-referencing canonical URL and
 * JPEG social share cards for public event detail pages.
 */
export async function generateMetadata(
    { params }: { params: Promise<{ reference: string }> }
): Promise<Metadata> {
    let event: EventMetadataRow | null = null;
    let reference = '';

    try {
        const supabase = createPublicClient();
        const paramsRef = await params;
        reference = paramsRef.reference;

        const { data, error } = await supabase
            .schema('api')
            .from('v1_event_detail')
            .select('title, description, media, cover_image_url')
            .eq('reference', reference)
            .single();

        if (error || !data) {
            return buildNotFoundMetadata();
        }
        event = data;
    } catch {
        return buildNotFoundMetadata();
    }

    const eventImage = getEventImage(event);
    const dynamicOgUrl = `https://lynk-x.app/api/og/event?reference=${encodeURIComponent(reference)}`;

    const plainDescription = stripHtml(event.description || '');
    const shortDescription = plainDescription.substring(0, 160) || 'Experience this event on Lynk-X.';

    const ogImages = [
        {
            url: dynamicOgUrl,
            width: 1200,
            height: 630,
            alt: event.title,
            type: 'image/jpeg',
        },
        ...(eventImage ? [{ url: eventImage, alt: event.title, width: 1200, height: 630 }] : []),
    ];

    const twitterImages = [
        {
            url: dynamicOgUrl,
            width: 1200,
            height: 630,
            alt: event.title,
        },
        ...(eventImage ? [{ url: eventImage, alt: event.title }] : []),
    ];

    return {
        title: event.title,
        description: shortDescription,
        openGraph: {
            title: `${event.title} | Lynk-X`,
            description: shortDescription,
            url: `/event/${reference}`,
            siteName: 'Lynk-X',
            locale: 'en_GB',
            type: 'website',
            images: ogImages,
        },
        twitter: {
            card: 'summary_large_image',
            site: '@lynkxapp',
            creator: '@lynkxapp',
            title: `${event.title} | Lynk-X`,
            description: shortDescription,
            images: twitterImages,
        },
        alternates: {
            canonical: `/event/${reference}`,
        },
    };
}

/**
 * Public event detail page cached via 60-second ISR. Emits Event and
 * BreadcrumbList JSON-LD and surfaces related upcoming events.
 */
export default async function EventPage({ params }: { params: Promise<{ reference: string }> }) {
    const supabase = createPublicClient();
    const { reference } = await params;

    const { data: rawEvent, error } = await supabase
        .schema('api')
        .from('v1_event_detail')
        .select('*')
        .eq('reference', reference)
        .single();

    if (error || !rawEvent) {
        notFound();
    }

    // Fetch ticket tiers (includes sold-out detection) and event tags in parallel.
    const [{ data: ticketTiers }, { data: eventTagRows }] = await Promise.all([
        supabase
            .from('event_ticket_tiers')
            .select('id, display_name, description, price, capacity, tickets_sold, tickets_available, sales_start, sales_end')
            .eq('event_id', rawEvent.id)
            .eq('is_hidden', false)
            .order('price', { ascending: true }),
        supabase
            .from('event_tags')
            .select('tag_id')
            .eq('event_id', rawEvent.id),
    ]);

    const tagIds = (eventTagRows || [])
        .map((r: { tag_id?: string | null }) => r.tag_id)
        .filter((id): id is string => Boolean(id));

    let tagNames: string[] = [];
    let disclaimers: DisclaimerRow[] = [];
    if (tagIds.length > 0) {
        const [{ data: tagRows }, { data: disclaimerRows }] = await Promise.all([
            supabase
                .schema('api')
                .from('v1_tags')
                .select('id, name')
                .in('id', tagIds),
            supabase
                .schema('api')
                .from('v1_disclaimers')
                .select('id, title, content, is_active, effective_date')
                .in('tag_id', tagIds)
                .eq('is_active', true)
                .lte('effective_date', new Date().toISOString())
                .order('effective_date', { ascending: false }),
        ]);

        tagNames = (tagRows || [])
            .map((t: { name?: string | null }) => t.name)
            .filter((name): name is string => Boolean(name));
        if (disclaimerRows && disclaimerRows.length > 0) {
            disclaimers = disclaimerRows.map((d: DisclaimerRow) => ({
                id: d.id,
                title: d.title,
                content: d.content,
            }));
        }
    }

    // Fetch related upcoming events (same category first, fallback to latest public events).
    let relatedQuery = supabase
        .from('vw_events')
        .select('id, title, description, starts_at, ends_at, timezone, location, media, category, organizer_name, account_id, is_featured, reference, low_price, currency, tags, cover_image_url')
        .in('status', ['published', 'active'])
        .eq('is_private', false)
        .neq('id', rawEvent.id)
        .order('starts_at', { ascending: true })
        .limit(4);

    if (rawEvent.category) {
        relatedQuery = relatedQuery.eq('category', rawEvent.category);
    }

    let { data: rawRelated } = await relatedQuery;
    if ((!rawRelated || rawRelated.length === 0) && rawEvent.category) {
        const { data: fallbackRelated } = await supabase
            .from('vw_events')
            .select('id, title, description, starts_at, ends_at, timezone, location, media, category, organizer_name, account_id, is_featured, reference, low_price, currency, tags, cover_image_url')
            .in('status', ['published', 'active'])
            .eq('is_private', false)
            .neq('id', rawEvent.id)
            .order('starts_at', { ascending: true })
            .limit(4);
        rawRelated = fallbackRelated;
    }

    const relatedEvents: Event[] = (rawRelated || []).map((rel) => ({
        ...rel,
        start_datetime: rel.starts_at,
        end_datetime: rel.ends_at,
        media: {
            ...((rel.media as Record<string, unknown>) || {}),
            cover_image_url: getEventImage(rel),
        },
    })) as Event[];

    const tiers = (ticketTiers || []) as TicketTierRow[];
    const isSoldOut = tiers.length > 0 && tiers.every(
        (t) => (t.capacity !== null && (t.tickets_available ?? 0) <= 0)
            || (t.sales_end && new Date(t.sales_end) < new Date())
    );

    const isEventEnded = ['completed', 'cancelled'].includes(rawEvent.status)
        || (rawEvent.ends_at ? new Date(rawEvent.ends_at) < new Date() : false);

    const event: Event = {
        ...rawEvent,
        start_datetime: rawEvent.starts_at,
        end_datetime: rawEvent.ends_at,
        timezone: rawEvent.timezone ?? undefined,
        organizer_name: rawEvent.organizer_name,
        category: rawEvent.category,
    };

    const categorySlug = rawEvent.category ? slugifyCategory(rawEvent.category) : undefined;
    const eventImage = getEventImage(rawEvent);
    const plainDescription = stripHtml(event.description || '');
    const eventUrl = `https://lynk-x.app/event/${reference}`;

    const eventStatus = rawEvent.status === 'cancelled'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled';

    const isOnlineEvent = Boolean((event as Event & { is_online?: boolean }).is_online);
    const eventLocation = (event.location as { name?: string; city?: string; locality?: string; country?: string } | null);

    const eventSchema = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        description: plainDescription,
        startDate: event.start_datetime,
        endDate: event.end_datetime,
        eventStatus,
        eventAttendanceMode: isOnlineEvent
            ? 'https://schema.org/OnlineEventAttendanceMode'
            : 'https://schema.org/OfflineEventAttendanceMode',
        location: isOnlineEvent
            ? {
                '@type': 'VirtualLocation',
                url: eventUrl,
            }
            : {
                '@type': 'Place',
                name: eventLocation?.name || 'TBA',
                address: {
                    '@type': 'PostalAddress',
                    addressLocality: eventLocation?.city || eventLocation?.locality || '',
                    addressCountry: eventLocation?.country || '',
                },
            },
        image: eventImage ? [eventImage] : [],
        organizer: {
            '@type': 'Organization',
            name: event.organizer_name || 'Lynk-X Organizer',
            url: 'https://lynk-x.app',
        },
        offers: tiers.map((t) => {
            const isTierClosed = Boolean(t.sales_end && new Date(t.sales_end) < new Date());
            const hasCapacity = t.capacity === null || (t.tickets_available ?? 0) > 0;
            const availability = isEventEnded || rawEvent.status === 'cancelled'
                ? 'https://schema.org/Discontinued'
                : (!isTierClosed && hasCapacity)
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/SoldOut';

            return {
                '@type': 'Offer',
                name: t.display_name,
                price: t.price,
                priceCurrency: event.currency || 'KES',
                availability,
                url: eventUrl,
                ...(t.sales_start || rawEvent.created_at
                    ? { validFrom: t.sales_start || rawEvent.created_at }
                    : {}),
            };
        }),
    };

    const breadcrumbItems = [
        {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://lynk-x.app',
        },
        {
            '@type': 'ListItem',
            position: 2,
            name: 'Events',
            item: 'https://lynk-x.app/events',
        },
    ];

    if (rawEvent.category && categorySlug) {
        breadcrumbItems.push({
            '@type': 'ListItem',
            position: 3,
            name: rawEvent.category,
            item: `https://lynk-x.app/events/${categorySlug}`,
        });
    }

    breadcrumbItems.push({
        '@type': 'ListItem',
        position: breadcrumbItems.length + 1,
        name: event.title,
        item: eventUrl,
    });

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems,
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
            <EventDetailsView
                event={event}
                ticketTiers={tiers}
                disclaimers={disclaimers}
                isSoldOut={isSoldOut}
                isEventEnded={isEventEnded}
                tags={tagNames}
                relatedEvents={relatedEvents}
                categorySlug={categorySlug}
            />
        </>
    );
}
