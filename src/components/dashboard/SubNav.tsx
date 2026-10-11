"use client";

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './SubNav.module.css';

export interface SubNavTab {
    label: string;
    href: string;
    /** Lit only on this exact path. Use it for the overview tab, whose path is the prefix of every other tab. */
    exact?: boolean;
}

/**
 * Scrollable tab strip across the pages that belong to one record (an event, a campaign) below 1024 px.
 *
 * Desktop reaches those pages from the quick-link rows on each record's overview, which are hidden on small
 * screens, so this strip keeps every page of the record one tap away on a phone. Callers pass the tabs; the
 * record-specific wrappers (EventSubNav, CampaignSubNav) build them from the route's id.
 */
const SubNav = ({ tabs, label }: { tabs: SubNavTab[]; label: string }) => {
    const pathname = usePathname();
    const activeRef = useRef<HTMLAnchorElement>(null);

    // Bring the open tab into view, since the strip scrolls sideways and may start on a different tab.
    useEffect(() => {
        activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
    }, [pathname]);

    return (
        <nav className={styles.strip} aria-label={label}>
            {tabs.map((tab) => {
                const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        ref={isActive ? activeRef : undefined}
                        className={`${styles.tab} ${isActive ? styles.active : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
};

export default SubNav;
