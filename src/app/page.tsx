import { createClient } from '@/utils/supabase/server';
import HomeLayout from "@/components/public/HomeLayout";
import { Event } from "@/types";
import HomeClient from "@/components/public/HomeClient";

export default async function Home() {
  const supabase = await createClient();

  const [
    { data: rawEvents, error: eventsError },
    { data: categories, error: categoriesError },
    { data: tags, error: tagsError },
    { data: categoryTags, error: categoryTagsError }
  ] = await Promise.all([
    // Use vw_public_events instead of the raw `events` table:
    //  - already filters deleted_at IS NULL, status='published', is_private=false
    //  - already excludes events older than 1 day (ends_at >= now() - 1 day)
    //  - aggregates low_price in SQL (no N+1 ticket_tiers sub-query on the client)
    //  - includes timezone for correct client-side display
    //  - is correctly indexed via idx_events_status_active
    supabase
      .from('vw_public_events')
      .select('id, title, description, starts_at, ends_at, timezone, location_name, thumbnail_url, category, organizer_name, account_id, low_price, currency')
      .order('is_featured', { ascending: false }) // featured events first
      .order('starts_at', { ascending: true })
      .limit(50),
    supabase.from('event_categories').select('id, display_name').order('display_name'),
    supabase.from('tags').select('id, name, type_id').order('name'),
    supabase.from('category_tags').select('*')
  ]);

  if (eventsError || categoriesError || tagsError || categoryTagsError) {
    console.error('Home page fetch errors:', {
      events: eventsError?.message,
      categories: categoriesError?.message,
      tags: tagsError?.message,
      categoryTags: categoryTagsError?.message,
    });
  }

  // vw_public_events already computes low_price — just remap column names to the Event type.
  const allEvents = (rawEvents || []).map(event => ({
    ...event,
    start_datetime: event.starts_at,
    end_datetime: event.ends_at,
  })) as Event[];

  // Carousel: prefer admin-curated featured events; fill remaining slots from upcoming.
  const featuredEvents = allEvents.filter(e => e.is_featured);
  const carouselEvents = featuredEvents.length > 0
    ? featuredEvents.slice(0, 5)
    : allEvents.slice(0, 5);

  return (
    <HomeLayout
      categories={categories || []}
      tags={tags || []}
      categoryTags={categoryTags || []}
    >
      <HomeClient
        carouselEvents={carouselEvents}
        allEvents={allEvents}
        categories={categories || []}
        tags={tags || []}
        categoryTags={categoryTags || []}
      />
    </HomeLayout>
  );
}
