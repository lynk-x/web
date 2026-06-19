"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './SupportFAB.module.css';

export default function SupportFAB() {
    const router = useRouter();
    const pathname = usePathname();

    // Do not show FAB if the user is already on the support page or admin support page
    if (pathname.includes('/support')) {
        return null;
    }

    // Do not show FAB on the dashboard root page (workspace picker)
    if (pathname === '/dashboard') {
        return null;
    }

    // Do not show FAB on system and admin dashboards
    if (pathname.startsWith('/dashboard/system') || pathname.startsWith('/dashboard/admin')) {
        return null;
    }

    const handleClick = () => {
        router.push('/dashboard/support');
    };

    return (
        <div className={styles.fabContainer}>
            <button 
                className={styles.fabButton}
                onClick={handleClick}
                aria-label="Get Support"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className={styles.tooltip}>Help & Support</span>
            </button>
        </div>
    );
}
