import { createClient } from '@/utils/supabase/server';
import HomeLayout from "@/components/public/HomeLayout";
import { Event } from "@/types";
import HomeClient from "@/components/public/HomeClient";

export default async function Home() {
  const supabase = await createClient();

  // Fetch events from Supabase
  const { data: events } = await supabase
    .from('public_events_view')
    .select('*')
    .eq('status', 'published')
    .order('start_datetime', { ascending: true })
    .limit(50); // Fetch more for pagination

  // Fallback Mock Data
  const mockEvents = Array.from({ length: 14 }).map((_, i) => ({
    id: `mock-${i}`,
    title: `Event ${i + 1} Title`,
    description: "This is a sample event description for development purposes.",
    start_datetime: new Date().toISOString(),
    thumbnail_url: `https://images.unsplash.com/photo-${1540575467063 + i}-178a50c2df87`,
    category: "Music",
    currency: "KES",
    low_price: 1000 + (i * 100)
  }));

  const allEvents = (events && events.length > 0) ? events : mockEvents;

  // Split Logic: First 5 for Carousel, Rest for Grid
  const carouselEvents = allEvents.slice(0, 5) as Event[];
  const gridEvents = allEvents.slice(5) as Event[];

  return (
    <HomeLayout>
      <HomeClient
        carouselEvents={carouselEvents}
        gridEvents={gridEvents}
      />
    </HomeLayout>
  );
}
