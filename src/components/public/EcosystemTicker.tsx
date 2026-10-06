"use client";

import React from 'react';
import styles from './EcosystemTicker.module.css';
import {
    ENABLE_REAL_ECOSYSTEM_LOGOS,
    REAL_ECOSYSTEM_LOGOS,
    ORGANIZER_CATEGORIES,
    ADVERTISER_CATEGORIES,
    ATTENDEE_CATEGORIES,
    VerticalCategory,
} from '@/data/ecosystem';

export interface EcosystemTickerProps {
    variant: 'organizers' | 'advertisers' | 'attendees';
}

/**
 * Ambient, continuous horizontal ticker positioned after the lifecycle section.
 * Renders verified event and sponsor categories (Option 2) with zero header text,
 * and includes a documented switch path for real client/partner logos (Option 3).
 */
export default function EcosystemTicker({ variant }: EcosystemTickerProps) {
    // ─────────────────────────────────────────────────────────────────────────
    // OPTION 3 SWITCH PATH: REAL PARTNER LOGOS
    // ─────────────────────────────────────────────────────────────────────────
    // When real client/partner SVG logos are available:
    // 1. Set `ENABLE_REAL_ECOSYSTEM_LOGOS = true` in `@/data/ecosystem`.
    // 2. Add logos to `REAL_ECOSYSTEM_LOGOS[variant]`.
    // 3. This block will activate automatically, rendering the verified partner
    //    logo track instead of the category capsules without any layout shift.
    // ─────────────────────────────────────────────────────────────────────────
    if (ENABLE_REAL_ECOSYSTEM_LOGOS && REAL_ECOSYSTEM_LOGOS[variant]?.length > 0) {
        const realLogos = REAL_ECOSYSTEM_LOGOS[variant];
        return (
            <aside className={styles.container} aria-label="Featured partners and ecosystem brands">
                <div className={styles.track}>
                    <div className={styles.group}>
                        {realLogos.map((item) => (
                            <div key={`primary-${item.id}`} className={styles.realLogoItem} title={item.name}>
                                <div className={styles.realLogoSvgWrap}>
                                    {item.logoSvg}
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Duplicate group creates seamless infinite marquee loop */}
                    <div className={styles.group} aria-hidden="true">
                        {realLogos.map((item) => (
                            <div key={`dup-${item.id}`} className={styles.realLogoItem} tabIndex={-1}>
                                <div className={styles.realLogoSvgWrap}>
                                    {item.logoSvg}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTIVE: OPTION 2 VERTICAL CATEGORY MARQUEE
    // ─────────────────────────────────────────────────────────────────────────
    let categories: VerticalCategory[];
    switch (variant) {
        case 'organizers':
            categories = ORGANIZER_CATEGORIES;
            break;
        case 'advertisers':
            categories = ADVERTISER_CATEGORIES;
            break;
        case 'attendees':
            categories = ATTENDEE_CATEGORIES;
            break;
        default:
            categories = ORGANIZER_CATEGORIES;
    }

    // Render two identical groups in the track so CSS -50% translateX creates
    // a seamless, jitter-free infinite loop without JavaScript frame listeners.
    return (
        <aside className={styles.container} aria-label="Event and community verticals">
            <div className={styles.track}>
                <div className={styles.group}>
                    {categories.map((cat) => (
                        <div key={`primary-${cat.id}`} className={styles.categoryPill}>
                            <div className={styles.iconWrap}>
                                {cat.icon}
                            </div>
                            <div className={styles.textWrap}>
                                <span className={styles.label}>{cat.label}</span>
                                <span className={styles.sublabel}>{cat.sublabel}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.group} aria-hidden="true">
                    {categories.map((cat) => (
                        <div key={`dup-${cat.id}`} className={styles.categoryPill} tabIndex={-1}>
                            <div className={styles.iconWrap}>
                                {cat.icon}
                            </div>
                            <div className={styles.textWrap}>
                                <span className={styles.label}>{cat.label}</span>
                                <span className={styles.sublabel}>{cat.sublabel}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
}
