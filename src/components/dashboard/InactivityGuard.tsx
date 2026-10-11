'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './InactivityGuard.module.css';

/** How long the dashboard can sit untouched before it locks. */
const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours

/** How often the idle time is re-checked. The check compares timestamps, so a throttled timer only delays it. */
const CHECK_INTERVAL = 30 * 1000;

/** Shared across tabs, so activity in one keeps the others from locking. */
const LAST_ACTIVITY_KEY = 'lynkx.dashboard.lastActivity';

/** Anything that shows a person is there, including touch scrolling (which fires scroll and touchmove). */
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart', 'touchmove'] as const;

function readSharedActivity(): number {
    try {
        return Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || 0;
    } catch {
        return 0; // storage blocked: this tab's own timestamp is used alone
    }
}

/**
 * Security Enhancement: Inactivity Guard.
 *
 * Locks the dashboard behind a "Session Locked" overlay after two hours with no activity. Activity is recorded as
 * a timestamp (shared between tabs) and compared on an interval and whenever the tab becomes visible again, so a
 * phone that suspends the page in the background does not lock early, and a tab left open beside an active one
 * does not lock on its own. The page stays mounted behind the overlay, so nothing on it is thrown away.
 *
 * This is not the protection for risky actions: withdrawals and transfers ask for the wallet PIN on the server,
 * whatever the session age.
 */
export default function InactivityGuard({ children }: { children: React.ReactNode }) {
    const [isLocked, setIsLocked] = useState(false);
    const lastActivityRef = useRef(0); // set when the guard mounts; a page load counts as activity
    const router = useRouter();
    const pathname = usePathname();
    const { logout } = useAuth();

    useEffect(() => {
        if (isLocked) return;

        if (lastActivityRef.current === 0) lastActivityRef.current = Date.now();

        const markActive = () => {
            const now = Date.now();
            if (now - lastActivityRef.current < 1000) return; // pointermove and scroll fire constantly
            lastActivityRef.current = now;
            try { localStorage.setItem(LAST_ACTIVITY_KEY, String(now)); } catch { /* storage blocked */ }
        };

        const checkIdle = () => {
            const lastActive = Math.max(lastActivityRef.current, readSharedActivity());
            if (Date.now() - lastActive >= INACTIVITY_TIMEOUT) setIsLocked(true);
        };

        const onVisible = () => {
            if (document.visibilityState === 'visible') checkIdle();
        };

        ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, markActive, { passive: true, capture: true }));
        document.addEventListener('visibilitychange', onVisible);
        const interval = setInterval(checkIdle, CHECK_INTERVAL);

        return () => {
            ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActive, { capture: true }));
            document.removeEventListener('visibilitychange', onVisible);
            clearInterval(interval);
        };
    }, [isLocked]);

    const handleUnlock = async () => {
        // Clear session and redirect to login to force a fresh session
        await logout();
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    };

    return (
        <>
            {/* display: contents keeps the wrapper out of the layout; inert stops focus and clicks reaching the page behind the overlay. */}
            <div style={{ display: 'contents' }} inert={isLocked}>
                {children}
            </div>
            {isLocked && (
                <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="session-locked-title">
                    <div className={styles.modal}>
                        <div className={styles.icon}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </div>
                        <h2 id="session-locked-title" className={styles.title}>Session Locked</h2>
                        <p className={styles.text}>
                            Your session has been locked due to inactivity.
                        </p>
                        <button className={styles.button} onClick={handleUnlock}>
                            Re-authenticate
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
