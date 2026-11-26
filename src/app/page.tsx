import type { Metadata } from 'next';
import Link from 'next/link';
import { createPublicClient } from '@/utils/supabase/public';
import HomeLayout from '@/components/public/HomeLayout';
import EventCard from '@/components/public/EventCard';
import HomeBentoShowcase from '@/components/public/HomeBentoShowcase';
import HomeAudienceSwitcher from '@/components/public/HomeAudienceSwitcher';
import LynkXFooter from '@/components/public/LynkXFooter';
import SoftwareAppJsonLd from '@/components/public/SoftwareAppJsonLd';
import { getEventImage } from '@/utils/eventImage';
import { slugifyCategory } from '@/utils/categories';
import { formatDateInTimezone, formatTimeInTimezone } from '@/utils/format';
import { Event } from '@/types';
import styles from './home.module.css';

export const revalidate = 60;

export const metadata: Metadata = {
    title: {
        absolute: 'Lynk-X — The Ultimate Event App',
    },
    description: 'The ultimate event app — create events, buy tickets and join private event forums with zero app download required.',
    alternates: {
        canonical: '/',
    },
    openGraph: {
        title: 'Lynk-X — The Ultimate Event App',
        description: 'The ultimate event app — create events, buy tickets and join private event forums.',
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
        description: 'The ultimate event app — create events, buy tickets and join private event forums.',
        site: '@lynkxapp',
        creator: '@lynkxapp',
        images: ['/og-image.png?v=2'],
    },
};

/**
 * Brand and platform homepage (`/`) introducing Lynk-X for organizers,
 * attendees and sponsors while surfacing a live upcoming-events preview and
 * direct search handoff to `/events`.
 */
export default async function Home() {
    const supabase = createPublicClient();

    const [{ data: rawEvents }, { data: categories }] = await Promise.all([
        supabase
            .from('vw_events')
            .select('id, title, description, starts_at, ends_at, timezone, location, media, category, organizer_name, account_id, is_featured, reference, low_price, currency, tags, cover_image_url')
            .in('status', ['published', 'active'])
            .eq('is_private', false)
            .order('is_featured', { ascending: false })
            .order('starts_at', { ascending: true })
            .limit(4),
        supabase
            .schema('api')
            .from('v1_event_categories')
            .select('id, display_name')
            .order('display_name'),
    ]);

    const previewEvents: Event[] = (rawEvents || []).map((event) => ({
        ...event,
        start_datetime: event.starts_at,
        end_datetime: event.ends_at,
        media: {
            ...((event.media as Record<string, unknown>) || {}),
            cover_image_url: getEventImage(event),
        },
    })) as Event[];

    const itemListSchema = previewEvents.length > 0
        ? {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Trending & Upcoming Events on Lynk-X',
            itemListElement: previewEvents.map((event, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: `https://lynk-x.app/event/${event.reference}`,
                name: event.title,
            })),
        }
        : null;

    return (
        <HomeLayout hideCart={false} showBack={false}>
            <SoftwareAppJsonLd />
            {itemListSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
                />
            )}

            <div className={styles.brandPage}>
                <div className={styles.backgroundGlow} />

                <section className={styles.hero}>
                    <div className={styles.badge}>Event Ticketing &amp; Community Platform</div>
                    <h1 className={styles.title}>
                        Ticketing Meets Community. Every Event Has a Forum.
                    </h1>
                    <p className={styles.subtitle}>
                        Create events, sell tickets with instant mobile money and card checkout and connect attendees in private event forums — all in the browser with no app download required.
                    </p>

                    <form action="/events" method="GET" className={styles.searchForm} role="search">
                        <input
                            type="search"
                            name="q"
                            placeholder="Search upcoming events..."
                            aria-label="Search upcoming events"
                            className={styles.searchInput}
                        />
                        <button type="submit" className={styles.searchBtn}>
                            Find Events
                        </button>
                    </form>

                    <div className={styles.ctaRow}>
                        <Link href="/events" className={styles.btnPrimary}>
                            Browse Events
                        </Link>
                        <Link href="/dashboard/organize" className={styles.btnSecondary}>
                            Host an Event Free
                        </Link>
                    </div>
                </section>

                <HomeBentoShowcase />

                <section className={styles.section} aria-labelledby="upcoming-preview-heading">
                    <div className={styles.sectionHeaderRow}>
                        <div>
                            <h2 id="upcoming-preview-heading" className={styles.sectionTitle}>
                                Upcoming Events on Lynk-X
                            </h2>
                            <p className={styles.sectionSub}>
                                Explore live events by category or browse the full directory.
                            </p>
                        </div>
                        <Link href="/events" className={styles.viewAllLink}>
                            View All Events →
                        </Link>
                    </div>

                    <nav className={styles.pillBar} aria-label="Event categories">
                        <Link href="/events" className={styles.pill}>
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

                    {previewEvents.length > 0 && (
                        <div className={styles.eventsGrid}>
                            {previewEvents.map((event) => {
                                const dateStr = formatDateInTimezone(event.start_datetime, event.timezone);
                                const timeStr = formatTimeInTimezone(event.start_datetime, event.timezone);
                                return (
                                    <EventCard
                                        key={event.id}
                                        id={event.id}
                                        reference={event.reference}
                                        name={event.title}
                                        date={`${dateStr} • ${timeStr}`}
                                        category={event.category || 'General'}
                                        price={(event.low_price && event.currency) ? `${event.currency} ${event.low_price}` : 'Free'}
                                        image={getEventImage(event)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </section>

                <HomeAudienceSwitcher />
            </div>

            <LynkXFooter />
        </HomeLayout>
    );
}
