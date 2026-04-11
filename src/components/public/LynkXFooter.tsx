"use client";

import React from 'react';
import Link from 'next/link';
import styles from './LynkXFooter.module.css';

const LynkXFooter: React.FC = () => {
    return (
        <footer className={styles.footer}>
            <div className={styles.backgroundGlow} />

            <div className={styles.content}>
                <div className={styles.topRow}>

                    <div className={styles.column}>
                        <h4 className={styles.columnTitle}>Product</h4>
                        <ul className={styles.linkList}>
                            <li><Link href="/for/organizers" className={styles.link}>For Organizers</Link></li>
                            <li><Link href="/for/advertisers" className={styles.link}>For Advertisers</Link></li>
                            <li><Link href="/for/attendees" className={styles.link}>For Attendees</Link></li>
                        </ul>
                    </div>

                    <div className={styles.column}>
                        <h4 className={styles.columnTitle}>Resources</h4>
                        <ul className={styles.linkList}>
                            <li><Link href="/resources/guide" className={styles.link}>Hosting Guide</Link></li>
                            <li><Link href="/resources/help" className={styles.link}>Help Center</Link></li>
                            <li><Link href="/resources/safety" className={styles.link}>Safety & Security</Link></li>
                            <li><Link href="/organizer-agreement" className={styles.link}>Organizer Pact</Link></li>
                        </ul>
                    </div>

                    <div className={styles.column}>
                        <h4 className={styles.columnTitle}>Platform</h4>
                        <ul className={styles.linkList}>
                            <li><Link href="/privacy" className={styles.link}>Privacy</Link></li>
                            <li><Link href="/terms" className={styles.link}>Terms</Link></li>
                            <li><Link href="/cookies" className={styles.link}>Cookies</Link></li>
                            <li><Link href="/refund" className={styles.link}>Refunds</Link></li>
                        </ul>
                    </div>
                </div>

                <div className={styles.bottomRow}>
                    <span className={styles.copyright}>© {new Date().getFullYear()} Lynk-x.app — All rights reserved.</span>
                    <div className={styles.socialLinks}>
                        {/* Placeholder Social Icons */}
                        <a href="#" className={styles.socialLink} aria-label="X (Twitter)">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
                        </a>
                        <a href="#" className={styles.socialLink} aria-label="LinkedIn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default LynkXFooter;
