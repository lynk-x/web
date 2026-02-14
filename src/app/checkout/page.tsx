import { createClient } from '@/utils/supabase/server';
import CheckoutView from '@/components/CheckoutView';
import { Suspense } from 'react';

// Wrapper to allow useSearchParams in CheckoutView
function CheckoutWrapper({ event }: { event: any }) {
    return (
        <Suspense fallback={<div>Loading checkout...</div>}>
            <CheckoutView event={event} />
        </Suspense>
    );
}

export default async function CheckoutPage({
    searchParams,
}: {
    searchParams: { eventId?: string };
}) {
    const supabase = await createClient();
    const { eventId } = await searchParams;

    let event = null;

    if (eventId) {
        if (eventId === 'featured-1') {
            event = {
                id: "featured-1",
                title: "Nairobi Tech Summit 2024",
                description: "Join the biggest tech innovators in East Africa for a 3-day summit on AI, Blockchain, and the Future of Work.",
                start_time: "2024-10-12T09:00:00Z",
                end_time: "2024-10-14T17:00:00Z",
                location_name: "KICC, Nairobi",
                cover_image_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=2670",
                category: "Technology",
                low_price: 5000,
                currency: "KES",
                organizer_id: "mock-org"
            };
        } else {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();
            event = data;
        }
    }

    // If no event ID or event found, ideally handle error or showing empty cart.
    // For now, we pass null and let View handle it.

    return <CheckoutWrapper event={event} />;
}
