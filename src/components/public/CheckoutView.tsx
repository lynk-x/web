"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/app/checkout/page.module.css';
import Skeleton from './Skeleton';
import { Event } from '@/types';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';

/**
 * CheckoutView component handling the final purchase step.
 * It displays an order summary, contact form, and payment details form.
 */
const CheckoutView: React.FC = () => {
    const { items, getCartTotal, itemCount, removeFromCart } = useCart();

    // Derived state
    const serviceFeePerItem = 200;
    const totalServiceFee = itemCount * serviceFeePerItem;
    const subtotal = getCartTotal();
    const total = subtotal + totalServiceFee;

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    if (items.length === 0) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <Link href="/" className={styles.backBtn}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                    <div className={styles.logoContainer}>
                        <Image
                            src="/images/lynk-x_text.png"
                            alt="Lynk-X"
                            width={200}
                            height={60}
                            className={styles.logo}
                            priority
                        />
                    </div>
                    <div style={{ width: 24 }}></div>
                </header>
                <main className={styles.emptyStateContainer}>
                    <h2 className={styles.emptyStateTitle}>Your cart is empty</h2>
                    <p className={styles.emptyStateText}>Looks like you haven't added any tickets yet.</p>
                    <Link href="/" className={styles.payBtn} style={{ maxWidth: 200 }}>
                        Browse Events
                    </Link>
                </main>
            </div>
        );
    }

    // Use the first item's currency for display (assuming single currency for now)
    const currency = items[0]?.currency || 'KES';

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Link>
                <div className={styles.logoContainer}>
                    <Image
                        src="/images/lynk-x_text.png"
                        alt="Lynk-X"
                        width={200}
                        height={60}
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

                            {isLoading ? (
                                <>
                                    <Skeleton width="100%" height="24px" className={styles.summaryItem} style={{ margin: '8px 0' }} />
                                    <Skeleton width="100%" height="24px" className={styles.summaryItem} style={{ margin: '8px 0' }} />
                                    <Skeleton width="100%" height="24px" className={styles.summaryItem} style={{ margin: '8px 0' }} />
                                    <Skeleton width="100%" height="40px" className={styles.total} style={{ marginTop: 16 }} />
                                </>
                            ) : (
                                <>
                                    {items.map((item) => (
                                        <div key={item.id} className={styles.cartItem}>
                                            <div className={styles.cartItemInfo}>
                                                <div className={styles.cartItemHeader}>
                                                    <span>{item.eventTitle}</span>
                                                    <span>{item.currency} {(item.price * item.quantity).toLocaleString()}</span>
                                                </div>
                                                <div className={styles.cartItemDetails}>
                                                    <span>{item.ticketType} x {item.quantity}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className={styles.removeBtn}
                                                title="Remove item"
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}

                                    <div className={styles.summaryItem}>
                                        <span>Subtotal</span>
                                        <span>{currency} {subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <span>Service Fees</span>
                                        <span>{currency} {totalServiceFee.toLocaleString()}</span>
                                    </div>
                                    <div className={styles.total}>
                                        <span>Total</span>
                                        <span>{currency} {total.toLocaleString()}</span>
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
                                    <p className={styles.helperText}>* Prompt will be sent to your phone</p>
                                </>
                            )}
                        </section>

                        <div className={styles.footerActions}>
                            {isLoading ? (
                                <Skeleton width="100%" height="56px" borderRadius="8px" />
                            ) : (
                                <Link href="/checkout/confirmation" className={styles.payBtn}>
                                    Confirm & Pay {currency} {total.toLocaleString()}
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
