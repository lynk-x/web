"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

const ConfirmationContent = () => {
    const searchParams = useSearchParams();
    const orderRef = searchParams.get('order_ref') || 'LX-CONFIRMED';
    const eventId = searchParams.get('event_id') || '';

    return (
        <main className={styles.content}>
            {/* 🎊 Success Header Section */}
            <div className={styles.successHeader}>
                <h1 className={styles.title}>You're In!</h1>
                <p className={styles.message}>Order #{orderRef} confirmed. Your tickets are ready.</p>
                <div className={styles.successIcon}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="var(--color-brand-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>

            {/* 📱 The Lynk-X Bridge Portal */}
            <div className={styles.bridgeCard}>
                <div className={styles.appPromo}>
                    <h2>Proceed to Event forum</h2>
                    <p>Join other attendees in the exclusive event forum, participate in polls, and get live speaker updates.</p>
                </div>

                <div className={styles.actionGroup}>
                    <Link href={`https://app.lynk-x.com/auth/bridge?event_id=${encodeURIComponent(eventId)}`} className={styles.primaryBtn}>
                        <span className={styles.btnText}>Enter Event Forum</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </Link>
                    
                    <div className={styles.installNudge}>
                        <p>For the best experience, <strong>Install Lynk-X</strong> on your home screen.</p>
                    </div>
                </div>
            </div>

            <div className={styles.footerLink}>
                <Link href="/">Return to discovery</Link>
            </div>
        </main>
    );
};

const OrderConfirmationPage = () => {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/">
                    <Image
                        src="/lynk-x_combined_logo.svg"
                        alt="Lynk-X"
                        width={200}
                        height={60}
                        className={styles.logo}
                        priority
                    />
                </Link>
            </header>

            <Suspense fallback={<div className={styles.loading}>Loading Confirmation...</div>}>
                <ConfirmationContent />
            </Suspense>
        </div>
    );
};

export default OrderConfirmationPage;
