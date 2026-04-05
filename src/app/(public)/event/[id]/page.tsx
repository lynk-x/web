import { createClient } from '@/utils/supabase/server';
import EventDetailsView from '@/components/public/EventDetailsView';
import { notFound } from 'next/navigation';
import { Event } from '@/types';

export default async function EventPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { id } = await params;

    // Select from the raw table but apply the same filters as vw_public_events:
    // - deleted_at IS NULL: hide soft-deleted events
    // - status IN ('published', 'active'): only publicly visible events
    const { data: rawEvent, error } = await supabase
        .from('events')
        .select(`
            id, title, description, media, location, timezone, account_id,
            starts_at, ends_at, is_private, currency,
            organizer:accounts!account_id(display_name),
            category:event_categories(display_name)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .in('status', ['published', 'active'])
        .single();

    if (error || !rawEvent) {
        return notFound();
    }

    // Fetch ticket tiers (includes sold-out detection)
    const { data: ticketTiers } = await supabase
        .from('ticket_tiers')
        .select('id, display_name, description, price, capacity, tickets_sold')
        .eq('event_id', id)
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
        .eq('event_id', id);

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
        organizer_name: (rawEvent.organizer as { display_name?: string } | null)?.display_name,
        category: (rawEvent.category as { display_name?: string } | null)?.display_name,
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
