"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import styles from './Sidebar.module.css';
import { modeFromPathname, navGroups } from './sidebarNav';
import { usesMobileShell } from './mobileReady';
import type { DashboardMode } from '@/types/shared';
import OrganizationSwitcher from './OrganizationSwitcher';
import NotificationBellButton from './NotificationBellButton';
import { useAuth } from '@/context/AuthContext';

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Main dashboard sidebar.
 *
 * Acts as an orchestrator that composes:
 * - Logo link
 * - Organization Switcher
 * - Nav links driven by `navGroups` from `sidebarNav.tsx`
 * - `SidebarUserProfile` — footer user card
 *
 * Mode is derived from the current URL path and synchronized on navigation.
 */
const Sidebar = () => {
    const pathname = usePathname();
    const { user } = useAuth();

    const mode = useMemo<DashboardMode>(() => modeFromPathname(pathname), [pathname]);

    const navItems = useMemo(() => {
        if (!navGroups[mode]) return [];
        return navGroups[mode].flatMap(group => group.items);
    }, [mode]);

    const isUnverified = user && !user.email_confirmed_at;

    // Hide the sidebar on the workspace picker page — all other dashboard
    // sub-routes (organize, ads, admin) show the sidebar.
    // Note: /setup-profile is no longer under /dashboard, so no need to hide it here.
    const SIDEBAR_HIDDEN_PATHS = ['/dashboard'];
    if (SIDEBAR_HIDDEN_PATHS.includes(pathname)) return null;

    // With the mobile dashboard on, events and ads use the top bar and bottom tabs below 1024 px; otherwise the
    // sidebar stays (behind the "Desktop Only" notice).
    const hasMobileShell = usesMobileShell(mode);

    return (
        <aside className={`${styles.sidebar} ${hasMobileShell ? styles.hideBelowDesktop : ''}`}>
            {isUnverified && (
                <div className={styles.verificationBanner}>
                    <div className={styles.bannerContent}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        <span>Verify your email</span>
                    </div>
                </div>
            )}
            {/* Logo */}
            <Link href="/" className={styles.logoContainer}>
                <Image
                    src="/lynk-x_combined_logo.svg"
                    alt="Lynk-X"
                    width={200}
                    height={0}
                    style={{ objectFit: 'contain', width: '100%', height: 'auto' }}
                />
            </Link>


            {/* Dashboard Mode Label */}
            <div className={styles.modeContextSection}>
                <span className={styles.modeContextLabel}>
                    {mode === 'admin' ? 'Admin Dashboard' : 
                     (mode === 'ads' || mode === 'commercial') ? 'Ads Manager' : 
                     mode === 'pulse' ? 'Pulse Dashboard' :
                     mode === 'system' ? 'System Control' :
                     'Events Dashboard'}
                </span>
                <div className={styles.modeContextDivider} />
            </div>

            {/* Navigation Links */}
            <nav className={styles.nav}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                    {navItems.map((item) => {
                        const normalizedPath = pathname.replace(/^\/ads/, '/dashboard/ads');
                        const normalizedHref = item.href.replace(/^\/ads/, '/dashboard/ads');
                        const isActive = normalizedPath === normalizedHref;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                            >
                                <span style={{ color: 'inherit', display: 'flex', alignItems: 'center' }}>
                                    {item.icon}
                                </span>
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Organization Switcher + Notifications */}
            <div style={{ marginTop: 'auto' }}>
                <NotificationBellButton />
                <OrganizationSwitcher pos="bottom" />
            </div>

        </aside>
    );
};

export default Sidebar;
