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
                            <li><Link href="/resources/pricing" className={styles.link}>Pricing & Fees</Link></li>
                        </ul>
                    </div>

                    <div className={styles.column}>
                        <h4 className={styles.columnTitle}>Resources</h4>
                        <ul className={styles.linkList}>
                            <li><Link href="/resources/help" className={styles.link}>Help Center</Link></li>
                            <li><Link href="/resources/guide" className={styles.link}>Hosting Guide</Link></li>
                            <li><Link href="/resources/safety" className={styles.link}>Safety & Security</Link></li>
                            <li><Link href="/resources/guidelines" className={styles.link}>Community Guidelines</Link></li>
                        </ul>
                    </div>

                    <div className={styles.column}>
                        <h4 className={styles.columnTitle}>Legal</h4>
                        <ul className={styles.linkList}>
                            <li><Link href="/terms" className={styles.link}>Terms of Service</Link></li>
                            <li><Link href="/privacy" className={styles.link}>Privacy Policy</Link></li>
                            <li><Link href="/cookies" className={styles.link}>Cookie Policy</Link></li>
                            <li><Link href="/refund" className={styles.link}>Refund Policy</Link></li>
                        </ul>
                    </div>

                    <div className={styles.column}>
                        <h4 className={styles.columnTitle}>Company</h4>
                        <ul className={styles.linkList}>
                            <li><Link href="/resources/mission" className={styles.link}>Our Mission</Link></li>
                            <li><Link href="/resources/brand" className={styles.link}>Brand Assets</Link></li>
                        </ul>
                    </div>
                </div>

                <div className={styles.bottomRow}>
                    <span className={styles.copyright}>© {new Date().getFullYear()} Lynk-x.app — All rights reserved.</span>
                    <div className={styles.socialLinks}>
                        <a href="https://x.com/lynkxapp" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="X (Twitter)">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4l11.733 16H20L8.267 4z" />
                                <path d="M4 20l6.768-6.768m2.46-2.46L20 4" />
                            </svg>
                        </a>
                        <a href="https://instagram.com/lynk_x.app" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="Instagram">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default LynkXFooter;
