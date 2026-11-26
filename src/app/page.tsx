import type { Metadata } from 'next';
import { Suspense } from 'react';
import { createPublicClient } from '@/utils/supabase/public';
import HomeLayout from "@/components/public/HomeLayout";
import { Event } from "@/types";
import HomeClient from "@/components/public/HomeClient";
import SoftwareAppJsonLd from "@/components/public/SoftwareAppJsonLd";
import { getEventImage } from "@/utils/eventImage";

export const revalidate = 60;

export const metadata: Metadata = {
  title: {
    absolute: 'Lynk-X — The Ultimate Event App',
  },
  description: 'The ultimate event app — create events, buy tickets and join event forums.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Lynk-X — The Ultimate Event App',
    description: 'The ultimate event app — create events, buy tickets and join event forums.',
    url: 'https://lynk-x.app',
    siteName: 'Lynk-X',
    locale: 'en_GB',
    images: [
      {
        url: '/og-image.png?v=2',
        width: 1200,
        height: 630,
        alt: 'Lynk-X — The Ultimate Event App',
        type: 'image/png',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lynk-X — The Ultimate Event App',
    description: 'The ultimate event app — create events, buy tickets and join event forums.',
    site: '@lynkxapp',
    creator: '@lynkxapp',
    images: ['/og-image.png?v=2'],
  },
};

/**
 * Public event discovery homepage cached with 60-second ISR. Fetches upcoming
 * public events, categories and tags via the cookie-free Supabase client.
 */
export default async function Home() {
  const supabase = createPublicClient();

  const [
    { data: rawEvents, error: eventsError },
    { data: categories, error: categoriesError },
    { data: tags, error: tagsError },
    { data: categoryTags, error: categoryTagsError }
  ] = await Promise.all([
    // Use vw_events instead of the raw `events` table:
    //  - already filters deleted_at IS NULL, status='published', is_private=false
    //  - already excludes events older than 1 day (ends_at >= now() - 1 day)
    //  - aggregates low_price in SQL (no N+1 ticket_tiers sub-query on the client)
    //  - includes timezone for correct client-side display
    //  - is correctly indexed via idx_events_status_active
    supabase.from('vw_events')
      .select('id, title, description, starts_at, ends_at, timezone, location, media, category, organizer_name, account_id, is_featured, reference, low_price, currency, tags, cover_image_url')
      .in('status', ['published', 'active'])
      .eq('is_private', false)
      .order('starts_at', { ascending: true })
      .limit(50),
    // approved-only filtering is baked into api.v1_event_categories
    supabase.schema('api').from('v1_event_categories').select('id, display_name').order('display_name'),
    supabase.schema('api').from('v1_tags').select('id, name, type_id').order('name'),
    supabase.schema('api').from('v1_category_tags').select('*')
  ]);

  if (eventsError || categoriesError || tagsError || categoryTagsError) {
    console.error('Home page fetch errors:', {
      events: eventsError?.message,
      categories: categoriesError?.message,
      tags: tagsError?.message,
      categoryTags: categoryTagsError?.message,
    });
  }

  // vw_events already computes low_price.
  const processedEvents = (rawEvents || []).map(event => ({
    ...event,
    start_datetime: event.starts_at,
    end_datetime: event.ends_at,
    // Ensure media object has cover_image_url for component compatibility
    media: {
      ...((event.media as Record<string, unknown>) || {}),
      cover_image_url: getEventImage(event),
    }
  })) as Event[];

  // Carousel: ONLY events with is_featured = true
  const carouselEvents = processedEvents.filter(e => e.is_featured);

  // Grid: All remaining events (exclude those already in the carousel)
  const allEvents = processedEvents.filter(e => !e.is_featured);

  const itemListSchema = processedEvents.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Upcoming Events on Lynk-X',
    itemListElement: processedEvents.slice(0, 20).map((event, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `https://lynk-x.app/event/${event.reference}`,
      name: event.title,
    })),
  } : null;

  return (
    <HomeLayout
      categories={categories || []}
      tags={tags || []}
      categoryTags={categoryTags || []}
    >
      <SoftwareAppJsonLd />
      {itemListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />
      )}
      <Suspense fallback={null}>
        <HomeClient
          carouselEvents={carouselEvents}
          allEvents={allEvents}
          categories={categories || []}
          tags={tags || []}
          categoryTags={categoryTags || []}
        />
      </Suspense>
    </HomeLayout>
  );
}
