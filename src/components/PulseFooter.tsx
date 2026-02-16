"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './PulseFooter.module.css';

const PulseFooter: React.FC = () => {
    const [ticketsSold, setTicketsSold] = useState(1243);

    // Simulate live ticket sales
    useEffect(() => {
        const interval = setInterval(() => {
            // Randomly increment by 1 or 2 tickets every few seconds
            if (Math.random() > 0.6) {
                setTicketsSold(prev => prev + Math.floor(Math.random() * 2) + 1);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <footer className={styles.footer}>
            <div className={styles.backgroundGlow} />

            <div className={styles.content}>
                <div className={styles.statsRow}>
                    <div className={styles.statItem}>
                        <div className={styles.liveDot} />
                        <div>
                            <div className={styles.statValue}>
                                {ticketsSold.toLocaleString()}
                            </div>
                            <div className={styles.statLabel}>
                                tickets sold today
                            </div>
                        </div>
                    </div>

                    <div className={styles.statItem}>
                        <div className={styles.liveDot} style={{ animationDelay: '1s', backgroundColor: 'var(--color-brand-secondary)' }} />
                        <div>
                            <div className={styles.statValue}>
                                50k+
                            </div>
                            <div className={styles.statLabel}>
                                active organizers
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.ctaSection}>
                    <h3 className={styles.ctaTitle}>Ready to host your own?</h3>
                    <Link href="/dashboard" className={styles.ctaLink}>
                        Get Started with Lynk-X
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                </div>
            </div>

            <div style={{ height: 'var(--spacing-xl)' }} />

            <div className={styles.content}>
                <div className={styles.legalRow}>
                    <div className={styles.legalLinks}>
                        <Link href="/privacy" className={styles.legalLink}>Privacy policy</Link>
                        <Link href="/terms" className={styles.legalLink}>Terms & condition</Link>
                    </div>
                    <span className={styles.copyright}>©Lynk-x.app</span>
                </div>
            </div>
        </footer>
    );
};

export default PulseFooter;
