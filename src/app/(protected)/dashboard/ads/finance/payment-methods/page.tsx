"use client";

import { useMemo } from 'react';
import PaymentMethodForm from '@/components/ads/billing/PaymentMethodForm';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import Spinner from '@/components/shared/Spinner';

export default function AddPaymentMethodPage() {
    const { activeAccount, isLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    if (isLoading && !activeAccount) {
        return (
            <div className={adminStyles.container}>
                <div style={{ padding: '60px', textAlign: 'center' }}>
                    <Spinner label="Loading account..." />
                </div>
            </div>
        );
    }

    if (!activeAccount) {
        return (
            <div className={adminStyles.container}>
                <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
                    No active account found.
                </div>
            </div>
        );
    }

    return (
        <div className={adminStyles.container}>
            <PageHeader
                title="Add Payment Method"
                subtitle="Securely add a new card to your account for ad payments."
                closeHref="/dashboard/ads/finance"
            />

            <div className={adminStyles.pageCard} style={{ marginTop: '24px', maxWidth: '600px' }}>
                <PaymentMethodForm
                    accountId={activeAccount.id}
                    supabase={supabase}
                    onSuccess={() => router.push('/dashboard/ads/finance')}
                    onCancel={() => router.back()}
                />
            </div>
        </div>
    );
}
