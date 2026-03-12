"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './PulseFooter.module.css';

const PulseFooter: React.FC = () => {

    return (
        <footer className={styles.footer}>
            <div className={styles.backgroundGlow} />

            <div className={styles.content}>
                <div className={styles.legalRow}>
                    <span className={styles.copyright}>©Lynk-x.app</span>
                    <div className={styles.legalLinks}>
                        <Link href="/privacy" className={styles.legalLink}>Privacy policy</Link>
                        <Link href="/terms" className={styles.legalLink}>Terms & condition</Link>
                        <Link href="/cookies" className={styles.legalLink}>Cookie Policy</Link>
                    </div>
                </div>

                <div className={styles.ctaSection}>
                    <h3 className={styles.ctaTitle}>Ready to host your own?</h3>
                    <Link href="/dashboard/organize" className={styles.ctaLink}>
                        Get Started with Lynk-X
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                </div>
            </div>
        </footer>
    );
};

export default PulseFooter;
