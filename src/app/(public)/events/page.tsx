import type { Metadata } from 'next';
import { Suspense } from 'react';
import { createPublicClient } from '@/utils/supabase/public';
import HomeLayout from '@/components/public/home/HomeLayout';
import HomeClient from '@/components/public/home/HomeClient';
import { getEventImage } from '@/utils/eventImage';
import { Event } from '@/types';

export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Upcoming Events & Tickets',
    description: 'Browse all upcoming concerts, tech meetups, festivals and community events on Lynk-X. Buy tickets online and join every event forum.',
    alternates: {
        canonical: '/events',
    },
    openGraph: {
        title: 'Upcoming Events & Tickets | Lynk-X',
        description: 'Browse all upcoming concerts, tech meetups, festivals and community events on Lynk-X.',
        url: 'https://lynk-x.app/events',
        siteName: 'Lynk-X',
        locale: 'en_GB',
        images: [
            {
                url: '/og-image.png?v=2',
                width: 1200,
                height: 630,
                alt: 'Upcoming Events on Lynk-X',
                type: 'image/png',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Upcoming Events & Tickets | Lynk-X',
        description: 'Browse all upcoming concerts, tech meetups, festivals and community events on Lynk-X.',
        site: '@lynkxapp',
        creator: '@lynkxapp',
        images: ['/og-image.png?v=2'],
    },
};

/**
 * Full public event discovery directory (`/events`) featuring search, date/tag
 * filters, featured carousel, category navigation and CollectionPage JSON-LD.
 */
export default async function AllEventsPage() {
    const supabase = createPublicClient();

    const [
        { data: rawEvents },
        { data: categories },
        { data: tags },
        { data: categoryTags },
    ] = await Promise.all([
        supabase
            .from('vw_events')
            .select('id, title, description, starts_at, ends_at, timezone, location, media, category, organizer_name, account_id, is_featured, reference, low_price, currency, tags, cover_image_url')
            .in('status', ['published', 'active'])
            .eq('is_private', false)
            .order('starts_at', { ascending: true })
            .limit(100),
        supabase
            .schema('api')
            .from('v1_event_categories')
            .select('id, display_name')
            .order('display_name'),
        supabase
            .schema('api')
            .from('v1_tags')
            .select('id, name, type_id')
            .order('name'),
        supabase
            .schema('api')
            .from('v1_category_tags')
            .select('*'),
    ]);

    const processedEvents: Event[] = (rawEvents || []).map((event) => ({
        ...event,
        start_datetime: event.starts_at,
        end_datetime: event.ends_at,
        media: {
            ...((event.media as Record<string, unknown>) || {}),
            cover_image_url: getEventImage(event),
        },
    })) as Event[];

    const carouselEvents = processedEvents.filter((e) => e.is_featured);
    const allEvents = processedEvents.filter((e) => !e.is_featured);

    const collectionSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Upcoming Events on Lynk-X',
        url: 'https://lynk-x.app/events',
        description: 'Browse all upcoming public events and tickets on Lynk-X.',
        ...(processedEvents.length > 0
            ? {
                mainEntity: {
                    '@type': 'ItemList',
                    itemListElement: processedEvents.slice(0, 24).map((event, index) => ({
                        '@type': 'ListItem',
                        position: index + 1,
                        url: `https://lynk-x.app/event/${event.reference}`,
                        name: event.title,
                    })),
                },
            }
            : {}),
    };

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://lynk-x.app',
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Events',
                item: 'https://lynk-x.app/events',
            },
        ],
    };

    return (
        <HomeLayout
            categories={categories || []}
            tags={tags || []}
            categoryTags={categoryTags || []}
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
            <Suspense fallback={null}>
                <HomeClient
                    carouselEvents={carouselEvents}
                    allEvents={allEvents}
                    categories={categories || []}
                    tags={tags || []}
                    categoryTags={categoryTags || []}
                    basePath="/events"
                />
            </Suspense>
        </HomeLayout>
    );
}
