"use client";

import { useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { isMobileReady } from './mobileReady';
import styles from './DesktopHandoff.module.css';

const DISMISSED_KEY = 'lynkx.dashboard.desktopHandoffDismissed';
const DISMISS_EVENT = 'lynkx:desktop-handoff-dismissed';

function subscribe(onChange: () => void) {
    window.addEventListener(DISMISS_EVENT, onChange);
    return () => window.removeEventListener(DISMISS_EVENT, onChange);
}

// Fallback for browsers that block sessionStorage, so Dismiss still works for the current page load.
let dismissedInMemory = false;

function readDismissed(): boolean {
    if (dismissedInMemory) return true;
    try {
        return sessionStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
        return false;
    }
}

/**
 * Non-blocking notice for dashboard pages that have not been redesigned for small screens yet.
 *
 * Replaces the full-screen "Desktop Only" overlay for the events and ads workspaces. People can read it, copy the
 * link to open on a bigger screen, or dismiss it for the rest of the session.
 */
const DesktopHandoff = () => {
    const pathname = usePathname();
    // The server snapshot is "dismissed" so the banner never flashes before storage is read on the client.
    const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);
    const [copied, setCopied] = useState(false);

    if (dismissed || isMobileReady(pathname)) return null;

    const dismiss = () => {
        dismissedInMemory = true;
        try { sessionStorage.setItem(DISMISSED_KEY, '1'); } catch { /* blocked storage: the in-memory flag covers this page load */ }
        window.dispatchEvent(new Event(DISMISS_EVENT));
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className={styles.banner} role="note">
            <p className={styles.text}>This page works best on a larger screen. Some tables and forms may need scrolling.</p>
            <div className={styles.actions}>
                <button type="button" className={styles.link} onClick={copyLink}>
                    {copied ? 'Link copied' : 'Copy link'}
                </button>
                <button type="button" className={styles.link} onClick={dismiss}>Dismiss</button>
            </div>
        </div>
    );
};

export default DesktopHandoff;
