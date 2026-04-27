"use client";

import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

export default function GetStartedPage() {
    const router = useRouter();
    const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

    useEffect(() => {
        createClient().auth.getSession().then(({ data: { session } }) => {
            setIsAuthed(!!session);
        });
    }, []);

    const handleChoice = (type: 'organizer' | 'advertiser') => {
        if (isAuthed) {
            router.push(`/dashboard?type=${type}`);
        } else {
            router.push(`/login?next=${encodeURIComponent(`/dashboard?type=${type}`)}`);
        }
    };

    if (isAuthed === null) {
        return (
            <div className={styles.container}>
                <div className={styles.spinner} />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Choose Your Path</h1>
                    <p className={styles.subtitle}>
                        Select the primary goal for your workspace. You can always add another later.
                    </p>
                </div>

                <div className={styles.roleGrid}>
                    <button
                        className={`${styles.roleCard} ${styles.organizerCard}`}
                        onClick={() => handleChoice('organizer')}
                    >
                        <div className={styles.roleIcon} style={{ background: 'rgba(32, 249, 40, 0.1)', color: 'var(--color-brand-primary)' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </div>
                        <h2 className={styles.roleName}>Event Organizer</h2>
                        <p className={styles.roleDesc}>
                            Create, manage, and sell tickets. Access powerful analytics and team management.
                        </p>
                        <span className={styles.cta} style={{ color: 'var(--color-brand-primary)' }}>
                            Get started →
                        </span>
                    </button>

                    <button
                        className={`${styles.roleCard} ${styles.advertiserCard}`}
                        onClick={() => handleChoice('advertiser')}
                    >
                        <div className={styles.roleIcon} style={{ background: 'rgba(249, 201, 32, 0.1)', color: 'var(--color-brand-secondary)' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                        </div>
                        <h2 className={styles.roleName}>Advertiser</h2>
                        <p className={styles.roleDesc}>
                            Promote your brand with high-impact ads across the discovery feed.
                        </p>
                        <span className={styles.cta} style={{ color: 'var(--color-brand-secondary)' }}>
                            Get started →
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
