"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import adminStyles from '../page.module.css';
import ConfigTab from '@/components/admin/settings/ConfigTab';
import FeatureFlagTab from '@/components/admin/settings/FeatureFlagTab';
import PaymentProvidersTab from '@/components/admin/settings/PaymentProvidersTab';
import RegionsTab from '@/components/admin/settings/RegionsTab';
import Tabs from '@/components/dashboard/Tabs';

type Tab = 'config' | 'feature-flags' | 'payment-providers' | 'regions';

function SettingsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialTab = searchParams.get('tab') as Tab;
    const [activeTab, setActiveTab] = useState<Tab>(
        (initialTab && ['config', 'feature-flags', 'payment-providers', 'regions'].includes(initialTab))
            ? initialTab
            : 'config'
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as Tab;
        if (tab && ['config', 'feature-flags', 'payment-providers', 'regions'].includes(tab)) {
            setActiveTab(tab as typeof activeTab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as Tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className={adminStyles.container}>
            <header className={adminStyles.header}>
                <div>
                    <h1 className={adminStyles.title}>Platform Settings</h1>
                    <p className={adminStyles.subtitle}>Manage global configurations and feature rollouts.</p>
                </div>
            </header>

            <Tabs
                options={[
                    { id: 'config', label: 'System Config' },
                    { id: 'feature-flags', label: 'Feature Flags' },
                    { id: 'payment-providers', label: 'Payment Providers' },
                    { id: 'regions', label: 'Supported Regions' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {activeTab === 'config' && <ConfigTab />}
            {activeTab === 'feature-flags' && <FeatureFlagTab />}
            {activeTab === 'payment-providers' && <PaymentProvidersTab />}
            {activeTab === 'regions' && <RegionsTab />}
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
