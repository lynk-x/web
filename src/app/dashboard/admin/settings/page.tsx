"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import ConfigTab from '@/components/admin/settings/ConfigTab';
import FeatureFlagTab from '@/components/admin/settings/FeatureFlagTab';
import PaymentProvidersTab from '@/components/admin/settings/PaymentProvidersTab';
import RegionsTab from '@/components/admin/settings/RegionsTab';
import Tabs from '@/components/dashboard/Tabs';
import StatCard from '@/components/dashboard/StatCard';
import { createClient } from '@/utils/supabase/client';
import { useMemo, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';

type Tab = 'config' | 'feature-flags' | 'payment-providers' | 'regions';

function SettingsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [stats, setStats] = useState({
        configCount: 0,
        flagCount: 0,
        providerCount: 0,
        regionCount: 0
    });
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    const fetchStats = useCallback(async () => {
        setIsLoadingStats(true);
        try {
            const [configRes, flagRes, providerRes, regionRes] = await Promise.all([
                supabase.from('system_config').select('*', { count: 'exact', head: true }),
                supabase.from('feature_flags').select('*', { count: 'exact', head: true }),
                supabase.from('platform_payment_providers').select('*', { count: 'exact', head: true }),
                supabase.from('countries').select('*', { count: 'exact', head: true }).eq('is_active', true)
            ]);

            setStats({
                configCount: configRes.count || 0,
                flagCount: flagRes.count || 0,
                providerCount: providerRes.count || 0,
                regionCount: regionRes.count || 0
            });
        } catch (err: any) {
            console.error('Error fetching settings stats:', err);
        } finally {
            setIsLoadingStats(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

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

            <div className={adminStyles.statsGrid}>
                <StatCard 
                    label="System Configs" 
                    value={stats.configCount} 
                    change="Global variables"
                    isLoading={isLoadingStats} 
                />
                <StatCard 
                    label="Active Flags" 
                    value={stats.flagCount} 
                    change="Feature toggles"
                    trend="positive"
                    isLoading={isLoadingStats} 
                />
                <StatCard 
                    label="Payment Gateways" 
                    value={stats.providerCount} 
                    change="Checkout options"
                    trend="neutral"
                    isLoading={isLoadingStats} 
                />

                <StatCard 
                    label="Active Countries" 
                    value={stats.regionCount} 
                    change="Operational zones"
                    trend="positive"
                    isLoading={isLoadingStats} 
                />
            </div>

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
