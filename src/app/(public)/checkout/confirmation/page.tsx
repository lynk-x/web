"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import styles from './page.module.css';

const ConfirmationContent = () => {
    const searchParams = useSearchParams();
    const orderRef = searchParams.get('order_ref') || 'LX-CONFIRMED';
    const eventId = searchParams.get('event_id') || '';

    // This page previously rendered "You're In!" purely off raw URL query
    // params, with no server check — a stray link or replayed URL could show
    // a false success state with no purchase behind it. Verify server-side
    // that the current session actually holds a completed ticket for this
    // event before rendering success.
    const [verifyState, setVerifyState] = useState<'checking' | 'verified' | 'unverified'>('checking');
    const [ticketCount, setTicketCount] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const verify = async () => {
            if (!eventId) {
                if (!cancelled) setVerifyState('unverified');
                return;
            }
            try {
                const supabase = createClient();
                const { data, error } = await supabase.schema('api').rpc('verify_completed_order', {
                    p_event_id: eventId,
                });
                if (cancelled) return;
                const row = Array.isArray(data) ? data[0] : data;
                if (!error && row && row.ticket_count > 0) {
                    setTicketCount(row.ticket_count);
                    setVerifyState('verified');
                } else {
                    setVerifyState('unverified');
                }
            } catch {
                if (!cancelled) setVerifyState('unverified');
            }
        };
        verify();
        return () => { cancelled = true; };
    }, [eventId]);

    if (verifyState === 'checking') {
        return (
            <main className={styles.content}>
                <div className={styles.successHeader}>
                    <h1 className={styles.title}>Confirming…</h1>
                    <p className={styles.message}>Verifying your order, one moment.</p>
                </div>
            </main>
        );
    }

    if (verifyState === 'unverified') {
        return (
            <main className={styles.content}>
                <div className={styles.successHeader}>
                    <h1 className={styles.title}>Order Not Found</h1>
                    <p className={styles.message}>We couldn&apos;t verify a completed order for this link. If you just paid, check your email or M-Pesa messages for confirmation, or contact support.</p>
                </div>
                <div className={styles.footerLink}>
                    <Link href="/">Return to discovery</Link>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.content}>
            {/* 🎊 Success Header Section */}
            <div className={styles.successHeader}>
                <h1 className={styles.title}>You're In!</h1>
                <p className={styles.message}>Order #{orderRef} confirmed. {ticketCount > 1 ? `Your ${ticketCount} tickets are` : 'Your ticket is'} ready.</p>
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
                    <Link href={`https://app.lynk-x.app/auth/bridge?event_id=${encodeURIComponent(eventId)}`} className={styles.primaryBtn}>
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
