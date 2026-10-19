"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { modeFromPathname, navGroups } from './sidebarNav';
import styles from './BottomTabBar.module.css';

/**
 * Bottom tab bar for the events and ads workspaces below 1024 px.
 *
 * Reads the same nav list as the sidebar, so the destinations stay in one place. Both workspaces have exactly
 * five entries, which is what the bar is sized for; other modes never render it.
 */
const BottomTabBar = () => {
    const pathname = usePathname();
    const mode = modeFromPathname(pathname);
    const items = (navGroups[mode] ?? []).flatMap((group) => group.items);

    return (
        <nav className={styles.bar} aria-label="Dashboard">
            {items.map((item, index) => {
                const normalizedPath = pathname.replace(/^\/ads/, '/dashboard/ads');
                const normalizedHref = item.href.replace(/^\/ads/, '/dashboard/ads');
                const isActive = index === 0 ? normalizedPath === normalizedHref : normalizedPath.startsWith(normalizedHref);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.tab} ${isActive ? styles.active : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <span className={styles.icon}>{item.icon}</span>
                        <span className={styles.label}>{item.mobileLabel ?? item.name}</span>
                    </Link>
                );
            })}
        </nav>
    );
};

export default BottomTabBar;
