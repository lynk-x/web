"use client";

import PaymentMethodForm from '@/components/ads/billing/PaymentMethodForm';
import styles from '../../page.module.css';

export default function AddPaymentMethodPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Add Payment Method</h1>
                    <p className={styles.subtitle}>Securely add a new card to your account for ad payments.</p>
                </div>
            </header>

            <div style={{ marginTop: '32px' }}>
                <PaymentMethodForm />
            </div>
        </div>
    );
}
