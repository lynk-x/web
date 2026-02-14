import { createClient } from '@/utils/supabase/server';
import EventDetailsView from '@/components/EventDetailsView';
import { notFound } from 'next/navigation';

export default async function EventPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { id } = await params;

    const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

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
                start_time: new Date().toISOString(),
                end_time: new Date(Date.now() + 86400000).toISOString(), // +1 day
                location_name: "KICC, Nairobi",
                cover_image_url: `https://images.unsplash.com/photo-${1540575467063 + mockIndex}-178a50c2df87`,
                category: "Technology",
                low_price: 1000 + (mockIndex * 100),
                currency: "KES",
                organizer_id: "mock-org"
            };
            return <EventDetailsView event={mockEvent} />;
        }

        return notFound();
    }

    return <EventDetailsView event={event} />;
}
