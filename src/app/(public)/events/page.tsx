import type { Metadata } from 'next';
import Link from 'next/link';
import { createPublicClient } from '@/utils/supabase/public';
import HomeLayout from '@/components/public/HomeLayout';
import EventGrid from '@/components/public/EventGrid';
import LynkXFooter from '@/components/public/LynkXFooter';
import { slugifyCategory } from '@/utils/categories';
import { getEventImage } from '@/utils/eventImage';
import { Event } from '@/types';
import styles from './events.module.css';

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
 * Full public upcoming-events directory page with category navigation,
 * crawlable pagination and CollectionPage + BreadcrumbList structured data.
 */
export default async function AllEventsPage() {
    const supabase = createPublicClient();

    const [{ data: rawEvents }, { data: categories }] = await Promise.all([
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
    ]);

    const events: Event[] = (rawEvents || []).map((event) => ({
        ...event,
        start_datetime: event.starts_at,
        end_datetime: event.ends_at,
        media: {
            ...((event.media as Record<string, unknown>) || {}),
            cover_image_url: getEventImage(event),
        },
    })) as Event[];

    const collectionSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Upcoming Events on Lynk-X',
        url: 'https://lynk-x.app/events',
        description: 'Browse all upcoming public events and tickets on Lynk-X.',
        ...(events.length > 0
            ? {
                mainEntity: {
                    '@type': 'ItemList',
                    itemListElement: events.slice(0, 24).map((event, index) => ({
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
        <HomeLayout hideCart={false} showBack={true}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />

            <div className={styles.pageWrapper}>
                <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
                    <Link href="/" className={styles.breadcrumbLink}>Home</Link>
                    <span className={styles.breadcrumbSeparator} aria-hidden="true">/</span>
                    <span className={styles.breadcrumbCurrent} aria-current="page">Events</span>
                </nav>

                <header className={styles.header}>
                    <h1 className={styles.title}>Upcoming Events on Lynk-X</h1>
                    <p className={styles.intro}>
                        Browse concerts, conferences, workshops and community gatherings across every category. Buy tickets in seconds and unlock each event&apos;s private attendee forum.
                    </p>
                    <p className={styles.countMeta}>
                        {events.length} upcoming {events.length === 1 ? 'event' : 'events'}
                    </p>
                </header>

                <nav className={styles.pillBar} aria-label="Event categories">
                    <Link href="/events" className={`${styles.pill} ${styles.pillActive}`} aria-current="page">
                        All Events
                    </Link>
                    {(categories || []).map((cat) => (
                        <Link
                            key={cat.id}
                            href={`/events/${slugifyCategory(cat.display_name)}`}
                            className={styles.pill}
                        >
                            {cat.display_name}
                        </Link>
                    ))}
                </nav>

                {events.length > 0 ? (
                    <EventGrid events={events} itemsPerPage={24} basePath="/events" />
                ) : (
                    <div className={styles.emptyCard}>
                        <h2 className={styles.emptyTitle}>No upcoming events listed yet</h2>
                        <p className={styles.emptyText}>
                            New events are published daily. Hosting your own event? Set up ticket tiers and a private attendee forum in minutes.
                        </p>
                        <div className={styles.emptyActions}>
                            <Link href="/dashboard/organize" className={styles.primaryCta}>
                                Host an Event Free
                            </Link>
                            <Link href="/for/organizers" className={styles.secondaryCta}>
                                Learn More for Organizers
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            <LynkXFooter />
        </HomeLayout>
    );
}
