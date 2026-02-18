"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './Sidebar.module.css';
import { navItems } from './sidebarNav';
import type { DashboardMode } from '@/types/shared';
import ModeSwitcher from './ModeSwitcher';
import SidebarUserProfile from './SidebarUserProfile';

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Main dashboard sidebar.
 *
 * Acts as an orchestrator that composes:
 * - Logo link
 * - `ModeSwitcher` — three-button pill for events / ads / admin
 * - Nav links driven by `navItems` from `sidebarNav.tsx`
 * - `SidebarUserProfile` — footer user card
 *
 * Mode is derived from the current URL path and synchronized on navigation.
 */
const Sidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const [mode, setMode] = useState<DashboardMode>('events');

    // Derive mode from URL on mount and path change
    useEffect(() => {
        if (pathname.startsWith('/dashboard/admin')) {
            setMode('admin');
        } else if (pathname.startsWith('/dashboard/ads')) {
            setMode('ads');
        } else {
            setMode('events');
        }
    }, [pathname]);

    /** Navigate to the root page of the selected mode. */
    const handleModeChange = (newMode: DashboardMode) => {
        setMode(newMode);
        const roots: Record<DashboardMode, string> = {
            events: '/dashboard/organize',
            ads: '/dashboard/ads',
            admin: '/dashboard/admin',
        };
        router.push(roots[newMode]);
    };

    return (
        <aside className={styles.sidebar}>
            {/* Logo */}
            <Link href="/" className={styles.logoContainer}>
                <Image
                    src="/images/lynk-x_text.png"
                    alt="Lynk-X"
                    width={200}
                    height={0}
                    style={{ objectFit: 'contain', width: '100%', height: 'auto' }}
                />
            </Link>

            {/* Mode Switcher */}
            <ModeSwitcher mode={mode} onModeChange={handleModeChange} />

            {/* Navigation Links */}
            <nav className={styles.nav}>
                {navItems[mode].map((item) => {
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
            </nav>

            {/* User Footer */}
            <SidebarUserProfile />
        </aside>
    );
};

export default Sidebar;
