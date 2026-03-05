import { createClient } from '@/utils/supabase/server';
import HomeLayout from "@/components/public/HomeLayout";
import { Event } from "@/types";
import HomeClient from "@/components/public/HomeClient";

export default async function Home() {
  const supabase = await createClient();

  // Fetch events from Supabase
  const [
    { data: rawEvents, error },
    { data: categories },
    { data: tags },
    { data: categoryTags }
  ] = await Promise.all([
    supabase.from('public_events_view').select('*').order('starts_at', { ascending: true }).limit(50),
    supabase.from('event_categories').select('*').order('name'),
    supabase.from('tags').select('*').order('name'),
    supabase.from('category_tags').select('category_id, tag_id, is_primary')
  ]);

  if (error) {
    console.error('Error fetching events:', error);
  }

  // Fallback Mock Data logic removed
  const allEvents = (rawEvents || []).map(event => ({
    ...event,
    start_datetime: event.starts_at,
    end_datetime: event.ends_at,
    thumbnail_url: event.cover_image_url || event.thumbnail_url
  })) as Event[];

  // Split Logic: First 5 for Carousel
  const carouselEvents = allEvents.slice(0, 5);

  return (
    <HomeLayout
      categories={categories || []}
      tags={tags || []}
      categoryTags={categoryTags || []}
    >
      <HomeClient
        carouselEvents={carouselEvents}
        allEvents={allEvents}
      />
    </HomeLayout>
  );
}
