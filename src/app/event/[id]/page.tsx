import { createClient } from '@/utils/supabase/server';
import EventDetailsView from '@/components/public/EventDetailsView';
import { notFound } from 'next/navigation';
import { Event } from '@/types';

export default async function EventPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { id } = await params;

    const { data: rawEvent, error } = await supabase
        .from('events')
        .select(`
            *,
            organizer:accounts!account_id(display_name),
            category:event_categories(display_name)
        `)
        .eq('id', id)
        .single();

    const { data: ticketTiers } = await supabase
        .from('ticket_tiers')
        .select('*, name:display_name')
        .eq('event_id', id)
        .order('price', { ascending: true });

    const event = rawEvent ? {
        ...rawEvent,
        start_datetime: rawEvent.starts_at,
        end_datetime: rawEvent.ends_at,
        thumbnail_url: rawEvent.thumbnail_url,
        organizer_name: rawEvent.organizer?.display_name,
        category: rawEvent.category?.display_name
    } as Event : null;

    if (error || !event) {
        // Fallback for demo/development if ID matches our static featured one
        // Fallback for demo/development if ID matches our static featured one or is a mock card
        if (id === 'featured-1' || id.startsWith('mock-')) {
            const isMock = id.startsWith('mock-');
            const mockIndex = isMock ? parseInt(id.split('-')[1]) : 0;

            const mockEvent = {
                id: id,
                title: isMock ? `Event ${mockIndex + 1} Title` : "Nairobi Tech Summit 2024",
                description: "Join the biggest tech innovators in East Africa for a 3-day summit on AI, Blockchain, and the Future of Work. This is a sample description to demonstrate the layout.",
                start_datetime: new Date().toISOString(),
                end_datetime: new Date(Date.now() + 86400000).toISOString(), // +1 day
                location_name: "KICC, Nairobi",
                thumbnail_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
                category: "Technology",
                account_id: "mock-org",
                organizer_name: "Mock Organization",
                low_price: 50,
                currency: "KES",
            };

            const mockTiers = [{
                id: 'mock-tier-1',
                name: 'Standard Ticket',
                description: 'General admission',
                price: 50
            }];

            return <EventDetailsView event={mockEvent} ticketTiers={mockTiers} />;
        }

        return notFound();
    }

    return <EventDetailsView event={event} ticketTiers={ticketTiers || []} />;
}
