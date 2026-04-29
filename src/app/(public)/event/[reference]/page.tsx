import { createClient } from '@/utils/supabase/server';
import EventDetailsView from '@/components/public/EventDetailsView';
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
        .from('vw_public_events')
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
        .from('vw_public_events')
        .select('*')
        .eq('reference', reference)
        .single();

    if (error || !rawEvent) {
        return notFound();
    }

    // Fetch ticket tiers (includes sold-out detection)
    const { data: ticketTiers } = await supabase
        .from('ticket_tiers')
        .select('id, display_name, description, price, capacity, tickets_sold')
        .eq('event_id', rawEvent.id)
        .is('deleted_at', null)
        .eq('is_hidden', false)
        .order('price', { ascending: true });

    // Fetch active disclaimers linked to this event via its tags.
    // Path: event_tags → tags → disclaimers (is_active = true, effective_date <= now)
    const { data: disclaimerRows } = await supabase
        .from('event_tags')
        .select(`
            tag:tags!tag_id(
                disclaimers(id, title, content, is_active, effective_date)
            )
        `)
        .eq('event_id', rawEvent.id);

    // Flatten nested join and deduplicate by disclaimer id
    const seen = new Set<string>();
    const disclaimers = (disclaimerRows || [])
        .flatMap((row: any) => row.tag?.disclaimers || [])
        .filter((d: any) => {
            if (!d.is_active || seen.has(d.id)) return false;
            if (d.effective_date && new Date(d.effective_date) > new Date()) return false;
            seen.add(d.id);
            return true;
        })
        .map((d: any) => ({ id: d.id, title: d.title, content: d.content }));

    // Determine if the event is sold out across all tiers
    const tiers = ticketTiers || [];
    const isSoldOut = tiers.length > 0 && tiers.every(
        (t: any) => t.capacity !== null && (t.tickets_sold ?? 0) >= t.capacity
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
