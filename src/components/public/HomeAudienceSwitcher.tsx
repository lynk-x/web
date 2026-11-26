'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    CheckCircle2,
    Megaphone,
    QrCode,
    Radio,
    ShieldCheck,
    Ticket,
    Users,
    Wallet,
} from 'lucide-react';
import styles from './HomeAudienceSwitcher.module.css';

type AudienceKey = 'attendees' | 'organizers' | 'sponsors';

interface AudienceConfig {
    key: AudienceKey;
    tabLabel: string;
    eyebrow: string;
    headline: string;
    summary: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    highlights: { icon: 'ticket' | 'radio' | 'qr' | 'wallet' | 'megaphone' | 'users' | 'shield'; title: string; desc: string }[];
}

const AUDIENCES: AudienceConfig[] = [
    {
        key: 'attendees',
        tabLabel: 'For Attendees',
        eyebrow: 'Zero App Download',
        headline: 'Every Ticket Unlocks the Live Event Community',
        summary: 'Discover upcoming events, pay in seconds with M-Pesa or card and jump straight into live event updates, chat and media walls from your browser.',
        primaryCta: { label: 'Browse Events', href: '/events' },
        secondaryCta: { label: 'See Attendee Experience', href: '/for/attendees' },
        highlights: [
            {
                icon: 'ticket',
                title: 'Fast Mobile Checkout',
                desc: 'Reserve your spot with instant M-Pesa STK push or card checkout in under 30 seconds.',
            },
            {
                icon: 'qr',
                title: 'Instant QR Pass',
                desc: 'Keep your scannable pass in the browser with no app store download required.',
            },
            {
                icon: 'radio',
                title: 'Live Forum & Audio Rooms',
                desc: 'Follow organizer announcements, vote in polls and join live audio rooms before and during the event.',
            },
        ],
    },
    {
        key: 'organizers',
        tabLabel: 'For Organizers',
        eyebrow: 'Ticketing + Community',
        headline: 'Sell Tickets, Scan Gates & Own Your Crowd',
        summary: 'Launch multi-tier ticketing in minutes, monitor real-time gate check-ins and broadcast directly to verified attendees in a dedicated forum.',
        primaryCta: { label: 'Host an Event Free', href: '/dashboard/organize' },
        secondaryCta: { label: 'Explore Organizer Tools', href: '/for/organizers' },
        highlights: [
            {
                icon: 'wallet',
                title: 'Transparent Payouts',
                desc: 'Track M-Pesa and card ticket sales in real time with automated settlement status.',
            },
            {
                icon: 'qr',
                title: 'Multi-Gate QR Check-In',
                desc: 'Verify passes at the door in milliseconds and watch live attendance capacity update.',
            },
            {
                icon: 'users',
                title: 'Direct Audience Channel',
                desc: 'Post pinned updates, run live polls and host audio or video stages without third-party group chats.',
            },
        ],
    },
    {
        key: 'sponsors',
        tabLabel: 'For Sponsors',
        eyebrow: 'Verified Event Reach',
        headline: 'Put Your Brand Inside Active Event Forums',
        summary: 'Reach confirmed ticket holders inside the event forum while they are actively checking schedules, live chat and stage updates.',
        primaryCta: { label: 'Launch a Campaign', href: '/for/ad-sponsors' },
        secondaryCta: { label: 'View Sponsor Placements', href: '/for/ad-sponsors' },
        highlights: [
            {
                icon: 'shield',
                title: '100% Real Attendees',
                desc: 'Every forum member holds a verified ticket or invite for that specific event.',
            },
            {
                icon: 'megaphone',
                title: 'Clean 50px Banner Slot',
                desc: 'High-visibility sponsor carousel pinned cleanly above the forum tabs without blocking content.',
            },
            {
                icon: 'ticket',
                title: 'Measurable Engagement',
                desc: 'Track impressions and click-throughs from high-intent local event communities.',
            },
        ],
    },
];

function renderHighlightIcon(icon: AudienceConfig['highlights'][number]['icon']) {
    switch (icon) {
        case 'ticket':
            return <Ticket size={18} aria-hidden="true" />;
        case 'radio':
            return <Radio size={18} aria-hidden="true" />;
        case 'qr':
            return <QrCode size={18} aria-hidden="true" />;
        case 'wallet':
            return <Wallet size={18} aria-hidden="true" />;
        case 'megaphone':
            return <Megaphone size={18} aria-hidden="true" />;
        case 'users':
            return <Users size={18} aria-hidden="true" />;
        case 'shield':
            return <ShieldCheck size={18} aria-hidden="true" />;
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

            <div className={styles.panel} role="tabpanel">
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
                                <CheckCircle2 size={15} className={styles.checkIcon} aria-hidden="true" />
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
