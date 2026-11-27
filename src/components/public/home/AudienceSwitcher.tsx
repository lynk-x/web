'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './AudienceSwitcher.module.css';

type AudienceKey = 'attendees' | 'organizers' | 'sponsors';
type HighlightIcon = 'ticket' | 'qr' | 'radio' | 'wallet' | 'users' | 'shield' | 'megaphone';

interface AudienceHighlight {
    step: string;
    icon: HighlightIcon;
    title: string;
    desc: string;
}

interface AudienceConfig {
    key: AudienceKey;
    tabLabel: string;
    eyebrow: string;
    headline: string;
    summary: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    highlights: AudienceHighlight[];
}

const AUDIENCES: AudienceConfig[] = [
    {
        key: 'attendees',
        tabLabel: 'For Attendees',
        eyebrow: 'Zero App Download',
        headline: 'Every Ticket Unlocks the Live Event Community',
        summary:
            'Discover upcoming events, pay in seconds with M-Pesa or card and jump straight into live event updates, chat and media walls right from your browser.',
        primaryCta: { label: 'Browse Events', href: '/events' },
        secondaryCta: { label: 'See Attendee Experience', href: '/for/attendees' },
        highlights: [
            {
                step: '01',
                icon: 'ticket',
                title: 'Fast Mobile Checkout',
                desc: 'Reserve your spot with instant M-Pesa STK push or card checkout in seconds.',
            },
            {
                step: '02',
                icon: 'qr',
                title: 'Browser QR Pass',
                desc: 'Keep your scannable pass ready in any mobile browser with zero app download.',
            },
            {
                step: '03',
                icon: 'radio',
                title: 'Updates, Chat & Media',
                desc: 'Follow organizer announcements, vote in polls and share photos with the whole crowd.',
            },
        ],
    },
    {
        key: 'organizers',
        tabLabel: 'For Organizers',
        eyebrow: 'Ticketing + Community',
        headline: 'Sell Tickets, Scan Gates & Own Your Crowd',
        summary:
            'Launch multi-tier ticketing in minutes, monitor real-time gate check-ins and broadcast directly to verified attendees in one dedicated forum.',
        primaryCta: { label: 'Host an Event Free', href: '/dashboard/organize' },
        secondaryCta: { label: 'Explore Organizer Tools', href: '/for/organizers' },
        highlights: [
            {
                step: '01',
                icon: 'wallet',
                title: 'Transparent Sales & Payouts',
                desc: 'Track M-Pesa and card ticket sales in real time with clear settlement tracking.',
            },
            {
                step: '02',
                icon: 'qr',
                title: 'Fast Gate Check-In',
                desc: 'Verify passes at the door across multiple gates and watch live attendance update.',
            },
            {
                step: '03',
                icon: 'users',
                title: 'Direct Crowd Channel',
                desc: 'Post pinned updates, run live polls and manage your crowd without third-party group chats.',
            },
        ],
    },
    {
        key: 'sponsors',
        tabLabel: 'For Sponsors',
        eyebrow: 'Verified Event Reach',
        headline: 'Put Your Brand Inside Active Event Forums',
        summary:
            'Reach confirmed ticket holders inside the event forum while they check schedules, live chat and stage updates.',
        primaryCta: { label: 'Launch a Campaign', href: '/for/ad-sponsors' },
        secondaryCta: { label: 'View Sponsor Placements', href: '/for/ad-sponsors' },
        highlights: [
            {
                step: '01',
                icon: 'shield',
                title: 'Verified Ticket Holders',
                desc: 'Every forum member holds a confirmed ticket or invite for that specific event.',
            },
            {
                step: '02',
                icon: 'megaphone',
                title: 'Non-Intrusive Placement',
                desc: 'Clean banner placements sit above the forum tabs so attendees see offers without feed clutter.',
            },
            {
                step: '03',
                icon: 'ticket',
                title: 'Measurable Reach',
                desc: 'Track impressions and clicks from high-intent local event communities in real time.',
            },
        ],
    },
];

function renderHighlightIcon(icon: HighlightIcon) {
    switch (icon) {
        case 'ticket':
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                        d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path d="M13 5v14" stroke="currentColor" strokeWidth="1.9" strokeDasharray="3 3" />
                </svg>
            );
        case 'qr':
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.9" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.9" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.9" />
                    <path d="M14 14h3v3h-3zM20 14v3M14 20h7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
            );
        case 'radio':
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="2" fill="currentColor" />
                    <path
                        d="M16.24 7.76a6 6 0 0 1 0 8.48M7.76 16.24a6 6 0 0 1 0-8.48M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                    />
                </svg>
            );
        case 'wallet':
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                        d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <circle cx="16.5" cy="13" r="1.25" fill="currentColor" />
                </svg>
            );
        case 'users':
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                    />
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.9" />
                    <path
                        d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                    />
                </svg>
            );
        case 'shield':
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            );
        case 'megaphone':
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                        d="M3 11l14-5v12L3 13v-2zM11.6 16.8a3 3 0 1 1-5.8-1.6"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path d="M17 9.5a4 4 0 0 1 0 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
            );
    }
}

/**
 * Interactive tabbed audience switcher on the homepage allowing attendees,
 * organizers and sponsors to inspect tailored workflows and CTAs.
 */
export default function HomeAudienceSwitcher() {
    const [activeKey, setActiveKey] = useState<AudienceKey>('attendees');
    const current = AUDIENCES.find((item) => item.key === activeKey) ?? AUDIENCES[0];

    return (
        <section className={styles.switcherSection} aria-labelledby="audience-switcher-heading">
            <div className={styles.headerBlock}>
                <h2 id="audience-switcher-heading" className={styles.sectionTitle}>
                    Built for Everyone in the Room
                </h2>
                <p className={styles.sectionSub}>
                    Switch views to see how Lynk-X works for ticket holders, hosts and brand partners.
                </p>

                <div className={styles.tabRow} role="tablist" aria-label="Select audience">
                    {AUDIENCES.map((aud) => {
                        const isActive = aud.key === activeKey;
                        return (
                            <button
                                key={aud.key}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
                                onClick={() => setActiveKey(aud.key)}
                            >
                                {aud.tabLabel}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div key={current.key} className={styles.panel} role="tabpanel">
                <div className={styles.panelIntro}>
                    <span className={styles.eyebrow}>{current.eyebrow}</span>
                    <h3 className={styles.panelHeadline}>{current.headline}</h3>
                    <p className={styles.panelSummary}>{current.summary}</p>

                    <div className={styles.ctaGroup}>
                        <Link href={current.primaryCta.href} className={styles.primaryBtn}>
                            {current.primaryCta.label}
                        </Link>
                        <Link href={current.secondaryCta.href} className={styles.secondaryBtn}>
                            {current.secondaryCta.label} →
                        </Link>
                    </div>
                </div>

                <div className={styles.highlightsGrid}>
                    {current.highlights.map((item) => (
                        <div key={item.title} className={styles.highlightCard}>
                            <div className={styles.highlightIconRow}>
                                <span className={styles.highlightIcon}>{renderHighlightIcon(item.icon)}</span>
                                <span className={styles.stepNum}>{item.step}</span>
                            </div>
                            <h4 className={styles.highlightTitle}>{item.title}</h4>
                            <p className={styles.highlightDesc}>{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
