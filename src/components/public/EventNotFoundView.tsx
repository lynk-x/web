"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './EventDetailsView.module.css';

const EventNotFoundView: React.FC = () => {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn} aria-label="Back to events">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Link>
                <div className={styles.logoWrapper}>
                    <Image
                        src="/lynk-x_combined_logo.svg"
                        alt="Lynk-X"
                        width={200}
                        height={60}
                        style={{ objectFit: 'cover' }}
                        priority
                    />
                </div>
            </header>

            <main className={styles.emptyStateContainer}>
                <h2 className={styles.emptyStateTitle}>Event Not Found</h2>
                <p className={styles.emptyStateText}>
                    The event reference you followed is incorrect or the event has been removed.
                </p>
                <Link href="/" className={styles.getTicketBtn} style={{ maxWidth: 240 }}>
                    Explore Events
                </Link>
            </main>
        </div>
    );
};

export default EventNotFoundView;
