"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import styles from './Sidebar.module.css';
import { navGroups } from './sidebarNav';
import type { DashboardMode } from '@/types/shared';
import OrganizationSwitcher from './OrganizationSwitcher';
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
    const [mode, setMode] = useState<DashboardMode>('events');

    const isUnverified = user && !user.email_confirmed_at;

    useEffect(() => {
        if (pathname.startsWith('/dashboard/admin')) {
            setMode('admin');
        } else if (pathname.startsWith('/dashboard/ads')) {
            setMode('ads');
        } else {
            setMode('events');
        }
    }, [pathname]);

    // Hide the sidebar on the workspace picker page — all other dashboard
    // sub-routes (organize, ads, admin) show the sidebar.
    // Note: /setup-profile is no longer under /dashboard, so no need to hide it here.
    const SIDEBAR_HIDDEN_PATHS = ['/dashboard'];
    if (SIDEBAR_HIDDEN_PATHS.includes(pathname)) return null;

    return (
        <aside className={styles.sidebar}>
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
                     mode === 'ads' ? 'Ads Dashboard' : 
                     'Events Dashboard'}
                </span>
                <div className={styles.modeContextDivider} />
            </div>

            {/* Navigation Links */}
            <nav className={styles.nav}>
                {navGroups[mode]?.map((group, gIdx) => (
                    <div key={gIdx} className={styles.navGroup}>
                        {group.title && <div className={styles.groupTitle}>{group.title}</div>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                            {group.items.map((item) => {
                                const isActive = pathname === item.href;
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
                    </div>
                ))}
            </nav>

            {/* Organization Switcher */}
            <div style={{ marginTop: 'auto' }}>
                <OrganizationSwitcher pos="bottom" />
            </div>

        </aside>
    );
};

export default Sidebar;
