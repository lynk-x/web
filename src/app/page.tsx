import type { Metadata } from 'next';
import Link from 'next/link';
import HomeLayout from '@/components/public/home/HomeLayout';
import DevicePreview from '@/components/public/forum/DevicePreview';
import AudienceSwitcher from '@/components/public/home/AudienceSwitcher';
import Footer from '@/components/public/shared/Footer';
import SoftwareAppJsonLd from '@/components/public/shared/SoftwareAppJsonLd';
import styles from './home.module.css';

export const metadata: Metadata = {
    title: {
        absolute: 'Lynk-X — Event Ticketing & Attendee Forums',
    },
    description: 'Create events, buy tickets and join a dedicated attendee forum for every event with zero app download required.',
    alternates: {
        canonical: '/',
    },
    openGraph: {
        title: 'Lynk-X — Event Ticketing & Attendee Forums',
        description: 'Create events, buy tickets and join a dedicated attendee forum for every event.',
        url: 'https://lynk-x.app',
        siteName: 'Lynk-X',
        locale: 'en_GB',
        images: [
            {
                url: '/og-image.png?v=2',
                width: 1200,
                height: 630,
                alt: 'Lynk-X — Event Ticketing & Attendee Forums',
                type: 'image/png',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Lynk-X — Event Ticketing & Attendee Forums',
        description: 'Create events, buy tickets and join a dedicated attendee forum for every event.',
        site: '@lynkxapp',
        creator: '@lynkxapp',
        images: ['/og-image.png?v=2'],
    },
};

/**
 * Brand and platform homepage (`/`) introducing Lynk-X for organizers,
 * attendees and sponsors with an interactive forum preview and direct search
 * handoff to `/events`.
 */
export default function Home() {
    return (
        <HomeLayout hideCart={false} showBack={false}>
            <SoftwareAppJsonLd />

            <div className={styles.brandPage}>
                <section className={styles.hero}>
                    <div className={styles.badge}>Event Ticketing &amp; Attendee Forums</div>
                    <h1 className={styles.title}>
                        Every event deserves a forum.
                    </h1>
                        <p className={styles.subtitle}>
                            Create events, sell tickets and connect attendees in private event forums — all in the browser with no app download required.
                        </p>

                    <form action="/events" method="GET" className={styles.searchForm} role="search">
                        <input
                            type="search"
                            name="q"
                            placeholder="Search upcoming events..."
                            aria-label="Search upcoming events"
                            className={styles.searchInput}
                        />
                        <button type="submit" className={styles.searchBtn} aria-label="Search">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </button>
                    </form>

                    <div className={styles.ctaRow}>
                        <Link href="/events" className={styles.btnPrimary}>
                            Browse Events
                        </Link>
                        <Link href="/dashboard/organize" className={styles.btnSecondary}>
                            Create an Event
                        </Link>
                    </div>
                    <div className={styles.readMoreDivider} aria-hidden="true">
                        <span>Read more</span>
                    </div>
                </section>

                <DevicePreview />

                <AudienceSwitcher />
            </div>

            <Footer />
        </HomeLayout>
    );
}
