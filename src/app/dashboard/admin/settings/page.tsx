"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import ConfigTab from '@/components/admin/settings/ConfigTab';
import FeatureFlagTab from '@/components/admin/settings/FeatureFlagTab';
import AdPricingTab from '@/components/admin/settings/AdPricingTab';
import TaxRatesTab from '@/components/admin/settings/TaxRatesTab';
import PaymentProvidersTab from '@/components/admin/settings/PaymentProvidersTab';
import Tabs from '@/components/dashboard/Tabs';

type Tab = 'config' | 'feature-flags' | 'ad-pricing' | 'payment-providers' | 'tax-rates';

function SettingsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const initialTab = searchParams.get('tab') as Tab;
    const [activeTab, setActiveTab] = useState<Tab>(
        (initialTab && ['config', 'feature-flags', 'ad-pricing', 'payment-providers', 'tax-rates'].includes(initialTab))
            ? initialTab
            : 'config'
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as Tab;
        if (tab && ['config', 'feature-flags', 'ad-pricing', 'payment-providers', 'tax-rates'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as Tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={adminStyles.title}>Platform Settings</h1>
                    <p className={adminStyles.subtitle}>Manage global configurations and feature rollouts.</p>
                </div>
            </header>

            <Tabs
                options={[
                    { id: 'config', label: 'System Config' },
                    { id: 'feature-flags', label: 'Feature Flags' },
                    { id: 'ad-pricing', label: 'Ad Pricing' },
                    { id: 'payment-providers', label: 'Payment Providers' },
                    { id: 'tax-rates', label: 'Tax Rates' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            <main className={styles.content}>
                {activeTab === 'config' && <ConfigTab />}
                {activeTab === 'feature-flags' && <FeatureFlagTab />}
                {activeTab === 'ad-pricing' && <AdPricingTab />}
                {activeTab === 'payment-providers' && <PaymentProvidersTab />}
                {activeTab === 'tax-rates' && <TaxRatesTab />}
            </main>
        </div>
    );
}

export default function AdminSettingsPage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Settings...</div>}>
            <SettingsContent />
        </Suspense>
    );
}
