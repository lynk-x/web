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
    const eventCreatedAtParam = searchParams.get('event_created_at') || '';

    // This page previously rendered "You're In!" purely off raw URL query
    // params, with no server check — a stray link or replayed URL could show
    // a false success state with no purchase behind it. Verify server-side
    // that the current session actually holds a completed ticket for this
    // event before rendering success.
    //
    // No claim-link/bridge token is minted anymore: checkout now signs the
    // buyer into a real, durable account via phone+OTP (see CheckoutView),
    // so the tickets already belong to the right identity the moment they're
    // purchased. Opening the PWA and logging in with the same phone number
    // resolves to the same account and its tickets — no re-pointing needed.
    const [verifyState, setVerifyState] = useState<'checking' | 'verified' | 'unverified'>('checking');
    const [ticketCount, setTicketCount] = useState(0);
    const [eventCreatedAt, setEventCreatedAt] = useState(eventCreatedAtParam);
    // Forum reference is a single opaque slug — unlike event_id + event_created_at,
    // there's no timestamp to mangle in transit, so the bridge link is built from
    // this instead whenever the lookup succeeds (falls back to the old params
    // otherwise, e.g. if the forum hasn't been created yet for some reason).
    const [forumReference, setForumReference] = useState<string | null>(null);

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
                    p_event_created_at: eventCreatedAtParam || null,
                });
                if (cancelled) return;
                const row = Array.isArray(data) ? data[0] : data;
                if (!error && row && row.ticket_count > 0) {
                    setTicketCount(row.ticket_count);
                    // Prefer the server-resolved value — covers the case where
                    // the URL param is missing (e.g. an older confirmation
                    // link) but the DB lookup still found it via the join.
                    if (row.event_created_at) setEventCreatedAt(row.event_created_at);
                    setVerifyState('verified');

                    const { data: forumRow } = await supabase
                        .schema('api')
                        .from('v1_forums')
                        .select('id, reference')
                        .eq('event_id', eventId)
                        .maybeSingle();
                    if (!cancelled && forumRow) {
                        setForumReference(forumRow.reference || forumRow.id);
                    }
                } else {
                    setVerifyState('unverified');
                }
            } catch {
                if (!cancelled) setVerifyState('unverified');
            }
        };
        verify();
        return () => { cancelled = true; };
    }, [eventId, eventCreatedAtParam]);

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
                    <Link href={forumReference
                        ? `https://app.lynk-x.app/auth/bridge?forum_reference=${encodeURIComponent(forumReference)}`
                        : `https://app.lynk-x.app/auth/bridge?event_id=${encodeURIComponent(eventId)}${eventCreatedAt ? `&event_created_at=${encodeURIComponent(eventCreatedAt)}` : ''}`
                    } className={styles.primaryBtn}>
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
