import { createClient } from '@/utils/supabase/server';
import HomeLayout from "@/components/public/HomeLayout";
import { Event } from "@/types";
import HomeClient from "@/components/public/HomeClient";

export default async function Home() {
  const supabase = await createClient();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    console.error('Supabase configuration missing!', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENT' : 'MISSING',
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'PRESENT' : 'MISSING'
    });
  }
  const [
    { data: rawEvents, error: eventsError },
    { data: categories, error: categoriesError },
    { data: tags, error: tagsError },
    { data: categoryTags, error: categoryTagsError }
  ] = await Promise.all([
    supabase
      .from('events')
      .select(`
        *,
        organizer:accounts(display_name),
        category:event_categories(display_name),
        ticket_tiers(price)
      `)
      .order('starts_at', { ascending: true })
      .limit(50),
    supabase.from('event_categories').select('id, display_name').order('display_name'),
    supabase.from('tags').select('*').order('name'),
    supabase.from('category_tags').select('*')
  ]);

  if (eventsError || categoriesError || tagsError || categoryTagsError) {
    console.error('Fetch errors detected:', {
      events: eventsError,
      categories: categoriesError,
      tags: tagsError,
      categoryTags: categoryTagsError
    });
  }

  // Fallback Mock Data logic removed
  const allEvents = (rawEvents || []).map(event => {
    const prices = event.ticket_tiers?.map((t: { price: number }) => t.price) || [];
    const lowPrice = prices.length > 0 ? Math.min(...prices) : undefined;

    return {
      ...event,
      start_datetime: event.starts_at,
      end_datetime: event.ends_at,
      thumbnail_url: event.thumbnail_url,
      organizer_name: event.organizer?.display_name,
      category: event.category?.display_name,
      low_price: lowPrice
    };
  }) as Event[];

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
