import type { Metadata } from 'next';
import Link from 'next/link';
import HomeLayout from '@/components/public/HomeLayout';
import ForumDevicePreview from '@/components/public/ForumDevicePreview';
import HomeAudienceSwitcher from '@/components/public/HomeAudienceSwitcher';
import LynkXFooter from '@/components/public/LynkXFooter';
import SoftwareAppJsonLd from '@/components/public/SoftwareAppJsonLd';
import styles from './home.module.css';

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
 * attendees and sponsors with an interactive forum preview and direct search
 * handoff to `/events`.
 */
export default function Home() {
    return (
        <HomeLayout hideCart={false} showBack={false}>
            <SoftwareAppJsonLd />

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

                <ForumDevicePreview />

                <HomeAudienceSwitcher />
            </div>

            <LynkXFooter />
        </HomeLayout>
    );
}
