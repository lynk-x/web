"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './CheckoutView.module.css';

interface CheckoutErrorViewProps {
    title?: string;
    description?: string;
    actionLabel?: string;
    actionHref?: string;
}

const CheckoutErrorView: React.FC<CheckoutErrorViewProps> = ({
    title = "Checkout Unavailable",
    description = "Your checkout session is invalid or has expired. Please return to the event page to select your tickets again.",
    actionLabel = "Back to Events",
    actionHref = "/"
}) => {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Link>
                <div className={styles.logoContainer}>
                    <Image src="/lynk-x_combined_logo.svg" alt="Lynk-X" width={200} height={60} style={{ objectFit: 'cover' }} priority />
                </div>
                <div className={styles.securityIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </header>

            <main className={styles.emptyStateContainer}>
                <div style={{ marginBottom: '24px', color: 'var(--color-brand-primary)' }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                        <path d="M3 6h18"></path>
                        <path d="M16 10a4 4 0 0 1-8 0"></path>
                    </svg>
                </div>
                <h2 className={styles.emptyStateTitle}>{title}</h2>
                <p className={styles.emptyStateText}>{description}</p>
                <Link href={actionHref} className={styles.payBtn} style={{ maxWidth: 240 }}>
                    {actionLabel}
                </Link>
            </main>
        </div>
    );
};

export default CheckoutErrorView;
