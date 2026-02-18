"use client";

import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

const OrderConfirmationPage = () => {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
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
            </header>

            <main className={styles.content}>
                <div className={styles.successIcon}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="var(--color-brand-secondary)" strokeWidth="2" />
                        <path d="M8 12L11 15L16 9" stroke="var(--color-brand-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <h1 className={styles.title}>Order Confirmed!</h1>
                <p className={styles.message}>Thank you for your purchase. Your tickets have been sent to your email.</p>

                <div className={styles.orderRef}>
                    <span className={styles.label}>Order Reference:</span>
                    <span className={styles.value}>#LX-8293-CONF</span>
                </div>

                <Link href="/" className={styles.homeBtn}>
                    Back to Home
                </Link>
            </main>
        </div>
    );
};

export default OrderConfirmationPage;
