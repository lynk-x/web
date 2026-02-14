"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/app/checkout/page.module.css';
import Skeleton from './Skeleton';
import { Event } from '@/types';
import { useSearchParams } from 'next/navigation';

interface CheckoutViewProps {
    event?: Event;
}

/**
 * CheckoutView component handling the final purchase step.
 * It displays an order summary, contact form, and payment details form.
 */
const CheckoutView: React.FC<CheckoutViewProps> = ({ event }) => {
    const searchParams = useSearchParams();
    const ticketIndex = searchParams.get('ticketIndex');

    // Derived state from props + params
    // In a real app, we'd fetch specific ticket types. For now, we infer availability.
    const isVip = ticketIndex === '1';
    const ticketName = isVip ? 'VIP All-Access' : 'Standard Ticket';
    const ticketPrice = isVip ? (event?.low_price || 0) * 2 : (event?.low_price || 0); // Mock VIP pricing logic
    const serviceFee = 200;
    const total = ticketPrice + serviceFee;

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    if (!event) {
        return <div className={styles.container}><p>Event not found.</p></div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href={`/event/${event.id}`} className={styles.backBtn}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Link>
                <div style={{ width: 200, height: 60, position: 'relative' }}>
                    <Image
                        src="/images/lynk-x_text.png"
                        alt="Lynk-X"
                        fill
                        style={{ objectFit: 'contain' }}
                        className={styles.logo}
                        priority
                    />
                </div>
                <div className={styles.securityIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </header>

            <main className={styles.content}>
                <div className={styles.layoutGrid}>
                    <div className={styles.summaryColumn}>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Order Summary</h2>
                            <h3 style={{ marginBottom: 16, fontSize: 18 }}>{event.title}</h3>

                            {isLoading ? (
                                <>
                                    <Skeleton width="100%" height="24px" className={styles.summaryItem} style={{ margin: '8px 0' }} />
                                    <Skeleton width="100%" height="24px" className={styles.summaryItem} style={{ margin: '8px 0' }} />
                                    <Skeleton width="100%" height="24px" className={styles.summaryItem} style={{ margin: '8px 0' }} />
                                    <Skeleton width="100%" height="40px" className={styles.total} style={{ marginTop: 16 }} />
                                </>
                            ) : (
                                <>
                                    <div className={styles.summaryItem}>
                                        <span>{ticketName} x 1</span>
                                        <span>{event.currency} {ticketPrice.toLocaleString()}</span>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <span>Service Fee</span>
                                        <span>{event.currency} {serviceFee.toLocaleString()}</span>
                                    </div>
                                    <div className={styles.total}>
                                        <span>Total</span>
                                        <span>{event.currency} {total.toLocaleString()}</span>
                                    </div>
                                </>
                            )}
                        </section>
                    </div>

                    <div className={styles.formsColumn}>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Contact Information</h2>
                            {isLoading ? (
                                <>
                                    <Skeleton width="100%" height="56px" style={{ marginBottom: 16 }} />
                                    <Skeleton width="100%" height="56px" style={{ marginBottom: 16 }} />
                                    <Skeleton width="100%" height="56px" />
                                </>
                            ) : (
                                <>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Full Name</label>
                                        <input type="text" className={styles.input} placeholder="John Doe" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Email Address</label>
                                        <input type="email" className={styles.input} placeholder="john@example.com" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Phone Number</label>
                                        <input type="tel" className={styles.input} placeholder="+254 700 000 000" />
                                    </div>
                                </>
                            )}
                        </section>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Payment Details</h2>
                            {isLoading ? (
                                <>
                                    <Skeleton width="100%" height="56px" style={{ marginBottom: 16 }} />
                                    <div className={styles.row}>
                                        <Skeleton width="100%" height="56px" />
                                        <Skeleton width="100%" height="56px" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>M-Pesa Number</label>
                                        <input type="tel" className={styles.input} placeholder="+254 7..." />
                                    </div>
                                    {/* Simplified for Guest Checkout MVP - focusing on Mpesa as primary for this region */}
                                    <p style={{ fontSize: 12, marginTop: 8, opacity: 0.7 }}>* Prompt will be sent to your phone</p>
                                </>
                            )}
                        </section>

                        <div className={styles.footerActions}>
                            {isLoading ? (
                                <Skeleton width="100%" height="56px" borderRadius="8px" />
                            ) : (
                                <Link href="/checkout/confirmation" className={styles.payBtn}>
                                    Confirm & Pay {event.currency} {total.toLocaleString()}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CheckoutView;
