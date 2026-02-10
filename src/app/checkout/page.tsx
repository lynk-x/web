"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';
import Skeleton from '../../components/Skeleton';

/**
 * CheckoutPage component handling the final purchase step.
 * It displays an order summary, contact form, and payment details form.
 * The layout adapts from a single column on mobile to a two-column grid on desktop.
 */
const CheckoutPage = () => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500); // Simulate 1.5s load time
        return () => clearTimeout(timer);
    }, []);
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/event-details" className={styles.backBtn}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Link>
                <Link href="/">
                    <Image
                        src="/images/lynk-x_text.png"
                        alt="Lynk-X"
                        width={200}
                        height={60}
                        className={styles.logo}
                        priority
                    />
                </Link>
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
                                        <span>VIP All-Access x 1</span>
                                        <span>KES 5,000.00</span>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <span>Early Bird Pass x 1</span>
                                        <span>KES 1,500.00</span>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <span>Service Fee</span>
                                        <span>KES 200.00</span>
                                    </div>
                                    <div className={styles.total}>
                                        <span>Total</span>
                                        <span>KES 6,700.00</span>
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
                                        <label className={styles.label}>Card Number</label>
                                        <input type="text" className={styles.input} placeholder="0000 0000 0000 0000" />
                                    </div>
                                    <div className={styles.row}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Expiry Date</label>
                                            <input type="text" className={styles.input} placeholder="MM/YY" />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>CVV</label>
                                            <input type="text" className={styles.input} placeholder="123" />
                                        </div>
                                    </div>
                                </>
                            )}
                        </section>

                        <div className={styles.footerActions}>
                            {isLoading ? (
                                <Skeleton width="100%" height="56px" borderRadius="8px" />
                            ) : (
                                <Link href="/checkout/confirmation" className={styles.payBtn}>
                                    Confirm & Pay KES 6,700.00
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CheckoutPage;
