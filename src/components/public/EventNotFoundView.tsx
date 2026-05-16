"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import EmptyStateGuide from '@/components/dashboard/EmptyStateGuide';
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

            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '100px 20px',
                minHeight: '60vh'
            }}>
                <EmptyStateGuide
                    title="Event Not Found"
                    description="The event reference you followed is incorrect or the event has been removed. Double check the URL and try again."
                    icon={
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    }
                    actionLabel="Explore Events"
                    actionHref="/"
                />
            </div>
        </div>
    );
};

export default EventNotFoundView;
