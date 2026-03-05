"use client";

import { useMemo } from 'react';
import PaymentMethodForm from '@/components/ads/billing/PaymentMethodForm';
import styles from '../../page.module.css';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

/**
 * Add Payment Method page for the Ads dashboard.
 * Passes the active account ID and a Supabase client to PaymentMethodForm
 * so the form can persist the new method to `account_payment_methods`.
 */
export default function AddPaymentMethodPage() {
    const { activeAccount, isLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
                    Loading account...
                </div>
            </div>
        );
    }

    if (!activeAccount) {
        return (
            <div className={styles.container}>
                <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
                    No active account found.
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Add Payment Method</h1>
                    <p className={styles.subtitle}>Securely add a new card to your account for ad payments.</p>
                </div>
            </header>

            <div style={{ marginTop: '32px' }}>
                <PaymentMethodForm
                    accountId={activeAccount.id}
                    supabase={supabase}
                    onSuccess={() => router.push('/dashboard/ads/billing')}
                    onCancel={() => router.back()}
                />
            </div>
        </div>
    );
}
