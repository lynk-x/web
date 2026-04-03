"use client";

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function UpgradePage() {
    const router = useRouter();

    const handleSubscribe = () => {
        // Here is where you integrate Paystack, Stripe, or Flutterwave checkouts!
        alert("Payment Gateway Integration goes here. Once paid, update user_profile SET is_premium = true!");
    };

    return (
        <div className={styles.container}>
            <header className={styles.appBar}>
                <button className={styles.iconBtn} onClick={() => router.back()}>
                    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                
                <Image 
                    src="/lynk-x_combined_logo.svg" 
                    alt="Lynk-X" 
                    width={200} 
                    height={60} 
                    style={{ objectFit: 'cover' }}
                    priority
                />
            </header>

            <div className={styles.contentWrapper}>
                <div className={styles.card}>
                    <div className={styles.iconWrapper}>
                        <svg viewBox="0 0 24 24" width="40" height="40" stroke="var(--color-brand-secondary)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </div>
                    
                    <h1 className={styles.title}>Lynk-X Premium</h1>
                    <p className={styles.description}>
                        Enhance your event experience. Get access to ad-free forums, exclusive badges, and seamless interactions across all your limits forever.
                    </p>

                    <div className={styles.benefitsList}>
                        <div className={styles.benefitItem}>
                            <div className={styles.check}>✓</div>
                            <span>Zero Ads in Live Chats</span>
                        </div>
                        <div className={styles.benefitItem}>
                            <div className={styles.check}>✓</div>
                            <span>Exclusive VIP Profile Badge</span>
                        </div>
                        <div className={styles.benefitItem}>
                            <div className={styles.check}>✓</div>
                            <span>Unlock Premium Custom Filters</span>
                        </div>
                    </div>

                    <div className={styles.priceContainer}>
                        <span className={styles.currency}>$</span>
                        <span className={styles.price}>4.99</span>
                        <span className={styles.duration}>/month</span>
                    </div>

                    <button className={styles.subscribeBtn} onClick={handleSubscribe}>
                        Upgrade Now
                    </button>
                    
                    <p className={styles.terms}>
                        By upgrading, you agree to our Terms of Service. This is a recurring subscription which you can cancel securely at any time.
                    </p>
                </div>
            </div>
        </div>
    );
}
