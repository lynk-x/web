import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createPublicClient } from '@/utils/supabase/public';
import HomeLayout from '@/components/public/HomeLayout';
import EventGrid from '@/components/public/EventGrid';
import FaqSection from '@/components/public/FaqSection';
import LynkXFooter from '@/components/public/LynkXFooter';
import {
    findCategoryBySlug,
    getCategorySeoProfile,
    slugifyCategory,
} from '@/utils/categories';
import { getEventImage } from '@/utils/eventImage';
import { Event } from '@/types';
import styles from '../events.module.css';

export const revalidate = 60;

interface CategoryPageProps {
    params: Promise<{ category: string }>;
}

/**
 * Pre-renders approved category landing pages at build time for fast ISR delivery.
 */
export async function generateStaticParams() {
    const supabase = createPublicClient();
    const { data: categories } = await supabase
        .schema('api')
        .from('v1_event_categories')
        .select('id, display_name');

    return (categories || []).map((cat) => ({
        category: slugifyCategory(cat.display_name),
    }));
}

/**
 * Generates self-canonicalized metadata and applies `index, follow` only when
 * the category currently has at least one active public event (Decision 2C).
 */
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
    const { category: slug } = await params;
    const supabase = createPublicClient();

    const { data: categories } = await supabase
        .schema('api')
        .from('v1_event_categories')
        .select('id, display_name');

    const matched = findCategoryBySlug(categories || [], slug);
    if (!matched) {
        return {
            title: 'Category Not Found',
            robots: { index: false, follow: false },
        };
    }

    const { count } = await supabase
        .from('vw_events')
        .select('id', { count: 'exact', head: true })
        .in('status', ['published', 'active'])
        .eq('is_private', false)
        .eq('category', matched.display_name);

    const hasActiveEvents = (count ?? 0) > 0;
    const profile = getCategorySeoProfile(matched.display_name, slug);
    const title = `${matched.display_name} Events & Tickets`;

    return {
        title,
        description: profile.metaDescription,
        robots: hasActiveEvents
            ? { index: true, follow: true }
            : { index: false, follow: true },
        alternates: {
            canonical: `/events/${slug}`,
        },
        openGraph: {
            title: `${title} | Lynk-X`,
            description: profile.metaDescription,
            url: `https://lynk-x.app/events/${slug}`,
            siteName: 'Lynk-X',
            locale: 'en_GB',
            images: [
                {
                    url: '/og-image.png?v=2',
                    width: 1200,
                    height: 630,
                    alt: `${matched.display_name} Events on Lynk-X`,
                    type: 'image/png',
                },
            ],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${title} | Lynk-X`,
            description: profile.metaDescription,
            site: '@lynkxapp',
            creator: '@lynkxapp',
            images: ['/og-image.png?v=2'],
        },
    };
}

/**
 * Programmatic category discovery hub rendering upcoming events for a specific
 * category, curated SEO copy, category FAQs and organizer fallback CTAs.
 */
export default async function CategoryEventsPage({ params }: CategoryPageProps) {
    const { category: slug } = await params;
    const supabase = createPublicClient();

    const { data: categories } = await supabase
        .schema('api')
        .from('v1_event_categories')
        .select('id, display_name')
        .order('display_name');

    const matched = findCategoryBySlug(categories || [], slug);
    if (!matched) {
        notFound();
    }

    const { data: rawEvents } = await supabase
        .from('vw_events')
        .select('id, title, description, starts_at, ends_at, timezone, location, media, category, organizer_name, account_id, is_featured, reference, low_price, currency, tags, cover_image_url')
        .in('status', ['published', 'active'])
        .eq('is_private', false)
        .eq('category', matched.display_name)
        .order('starts_at', { ascending: true })
        .limit(100);

    const events: Event[] = (rawEvents || []).map((event) => ({
        ...event,
        start_datetime: event.starts_at,
        end_datetime: event.ends_at,
        media: {
            ...((event.media as Record<string, unknown>) || {}),
            cover_image_url: getEventImage(event),
        },
    })) as Event[];

    const profile = getCategorySeoProfile(matched.display_name, slug);
    const categoryUrl = `https://lynk-x.app/events/${slug}`;

    const collectionSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: profile.headline,
        url: categoryUrl,
        description: profile.metaDescription,
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
            {
                '@type': 'ListItem',
                position: 3,
                name: matched.display_name,
                item: categoryUrl,
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
                    <Link href="/events" className={styles.breadcrumbLink}>Events</Link>
                    <span className={styles.breadcrumbSeparator} aria-hidden="true">/</span>
                    <span className={styles.breadcrumbCurrent} aria-current="page">
                        {matched.display_name}
                    </span>
                </nav>

                <header className={styles.header}>
                    <h1 className={styles.title}>{profile.headline}</h1>
                    <p className={styles.intro}>{profile.intro}</p>
                    <p className={styles.countMeta}>
                        {events.length} upcoming {events.length === 1 ? 'event' : 'events'} in {matched.display_name}
                    </p>
                </header>

                <nav className={styles.pillBar} aria-label="Event categories">
                    <Link href="/events" className={styles.pill}>
                        All Events
                    </Link>
                    {(categories || []).map((cat) => {
                        const catSlug = slugifyCategory(cat.display_name);
                        const isActive = catSlug === slug;
                        return (
                            <Link
                                key={cat.id}
                                href={`/events/${catSlug}`}
                                className={`${styles.pill} ${isActive ? styles.pillActive : ''}`}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {cat.display_name}
                            </Link>
                        );
                    })}
                </nav>

                {events.length > 0 ? (
                    <EventGrid
                        events={events}
                        itemsPerPage={24}
                        basePath={`/events/${slug}`}
                    />
                ) : (
                    <div className={styles.emptyCard}>
                        <h2 className={styles.emptyTitle}>
                            No upcoming {matched.display_name} events right now
                        </h2>
                        <p className={styles.emptyText}>
                            Planning a {matched.display_name.toLowerCase()} experience? Publish your event page, set up ticket tiers and launch an automatic attendee forum in minutes.
                        </p>
                        <div className={styles.emptyActions}>
                            <Link href="/dashboard/organize" className={styles.primaryCta}>
                                Host a {matched.display_name} Event on Lynk-X
                            </Link>
                            <Link href="/events" className={styles.secondaryCta}>
                                Browse All Upcoming Events
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            <FaqSection
                title={`${matched.display_name} FAQs`}
                subtitle={`Common questions about attending and hosting ${matched.display_name.toLowerCase()} events on Lynk-X.`}
                items={profile.faqs}
            />

            <LynkXFooter />
        </HomeLayout>
    );
}
