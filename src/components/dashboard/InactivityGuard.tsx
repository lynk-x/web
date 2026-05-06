'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './InactivityGuard.module.css';

/**
 * Security Enhancement: Inactivity Guard.
 * 
 * Monitors user interaction (mouse, keyboard, touch) within the dashboard.
 * If no activity is detected for 15 minutes, it "locks" the dashboard by showing
 * an overlay and requiring the user to re-authenticate.
 */
export default function InactivityGuard({ children }: { children: React.ReactNode }) {
    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
    const [isLocked, setIsLocked] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const { logout } = useAuth();

    const resetTimer = useCallback(() => {
        if (isLocked) return;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setIsLocked(true);
        }, INACTIVITY_TIMEOUT);
    }, [isLocked, INACTIVITY_TIMEOUT]);

    useEffect(() => {
        const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'wheel'];
        
        const handleEvent = () => resetTimer();
        
        events.forEach(event => {
            window.addEventListener(event, handleEvent);
        });

        // Initialize timer
        resetTimer();

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleEvent);
            });
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [resetTimer]);

    const handleUnlock = async () => {
        // Clear session and redirect to login to force a fresh session
        await logout();
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    };

    if (isLocked) {
        return (
            <div className={styles.overlay}>
                <div className={styles.modal}>
                    <div className={styles.icon}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <h2 className={styles.title}>Session Locked</h2>
                    <p className={styles.text}>
                        Your session has been locked due to inactivity to protect your account security.
                    </p>
                    <button className={styles.button} onClick={handleUnlock}>
                        Re-authenticate
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
