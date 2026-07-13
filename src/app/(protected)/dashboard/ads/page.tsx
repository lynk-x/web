"use client";
import { getErrorMessage } from '@/utils/error';

import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import Link from 'next/link';
import React, { useState, useEffect, useMemo } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency } from '@/utils/format';
import { useToast } from '@/components/ui/Toast';
import SystemBannerSpotlight from '@/components/shared/SystemBannerSpotlight';
import ProductTour from '@/components/dashboard/ProductTour';

export default function AdsDashboard() {
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    interface Spotlight {
        id: string;
        title: string;
        subtitle: string;
        backgroundImage: string;
        ctaLabel: string;
        ctaHref: string;
    }
    const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
    interface DashboardStat {
        label: string;
        value: string | null;
        change: string;
    }
    const [stats, setStats] = useState<DashboardStat[]>([
        { label: 'Total Campaigns', value: null, change: 'Lifetime count' },
        { label: 'Active Campaigns', value: null, change: 'Running now' },
        { label: 'Pending Approval', value: null, change: 'Under review' },
        { label: 'Remaining Budget', value: null, change: 'Available funds' },
    ]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!activeAccount) return;
            setIsLoading(true);
            try {
                const { data, error } = await supabase.schema('api').rpc('get_ads_dashboard_stats', { 
                    p_account_id: activeAccount.id 
                });

                if (error) throw error;

                const ds = data.stats || {};
                setStats([
                    { label: 'Total Campaigns', value: (ds.total_campaigns || 0).toLocaleString(), change: 'Lifetime count' },
                    { label: 'Active Campaigns', value: (ds.active_campaigns || 0).toLocaleString(), change: 'Running now' },
                    { label: 'Pending Approval', value: (ds.pending_approval || 0).toLocaleString(), change: 'Under review' },
                    { label: 'Remaining Budget', value: formatCurrency(ds.remaining_budget || 0, 'USD'), change: 'Available funds' },
                ]);

                setSpotlights(data.spotlights || []);
            } catch (error: unknown) {
                showToast(getErrorMessage(error) || 'Failed to sync dashboard performance.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        if (!isOrgLoading) {
            if (activeAccount) {
                fetchDashboardData();
            } else {
                setStats([
                    { label: 'Total Campaigns', value: '0', change: 'Lifetime count' },
                    { label: 'Active Campaigns', value: '0', change: 'Running now' },
                    { label: 'Pending Approval', value: '0', change: 'Under review' },
                    { label: 'Remaining Budget', value: formatCurrency(0), change: 'Available funds' },
                ]);
                setIsLoading(false);
            }
        }
    }, [activeAccount, isOrgLoading, supabase, showToast]);
    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title={activeAccount ? `Welcome back, ${activeAccount.name}👋` : 'Hi there👋...Ready to post ads?'}
                subtitle="Manage your campaigns and track performance."
            />

            {/* Key Metrics */}
            <div className={`${sharedStyles.statsGrid} tour-ads-stats`}>
                {stats.map((stat, index) => (
                    <StatCard
                        key={index}
                        label={stat.label}
                        value={stat.value}
                        change={stat.change}
                        trend="neutral"
                        isLoading={isLoading}
                    />
                ))}
            </div>

            {/* Quick Actions */}
            <section className={`${styles.quickActions} tour-ads-quick-actions`}>
                <h2 className={sharedStyles.sectionTitle}>Quick Actions</h2>
                <div className={styles.actionsGrid}>
                    <Link href="/dashboard/ads/campaigns/create" className={`${styles.actionCard} tour-create-campaign`}>
                        <span className={styles.actionLabel}>Create Campaign</span>
                    </Link>
                    <Link href="/dashboard/ads/campaigns" className={`${styles.actionCard} tour-manage-campaigns`}>
                        <span className={styles.actionLabel}>Manage Campaigns</span>
                    </Link>
                    <Link href="/dashboard/ads/analytics" className={`${styles.actionCard} tour-ads-analytics`}>
                        <span className={styles.actionLabel}>View Analytics</span>
                    </Link>
                    <Link href="/dashboard/ads/finance" className={`${styles.actionCard} tour-ads-billing`}>
                        <span className={styles.actionLabel}>Billing & Payments</span>
                    </Link>
                </div>
            </section>

            {/* Hero Spotlights */}
            {spotlights.length > 0 && (
                <section style={{ marginTop: '16px', marginBottom: '40px' }}>
                    <SystemBannerSpotlight slides={spotlights} />
                </section>
            )}

            {!isOrgLoading && (
                <ProductTour
                    storageKey={activeAccount ? `hasSeenAdsJoyride_${activeAccount.id}` : 'hasSeenAdsJoyride_guest'}
                    steps={[
                        {
                            target: 'body',
                            placement: 'center',
                            title: 'Ads Command Center',
                            content: 'Welcome to your Advertising Dashboard. Launch targeted campaigns that reach thousands of Lynk-X attendees across our forums right when they are browsing.',
                            skipBeacon: true,
                        },
                        {
                            target: '.tour-ads-stats',
                            title: 'Live Campaign Performance',
                            content: 'Monitor your combined reach, total impressions delivered and total clicks in real-time across all your active campaigns.',
                        },
                        {
                            target: '.tour-ads-quick-actions',
                            title: 'Quick Access',
                            content: 'Jump straight into creating campaigns, reviewing analytics or topping up your wallet to fund ongoing campaigns.',
                        },
                        {
                            target: '.tour-create-campaign',
                            title: 'Launch a Campaign',
                            content: 'Create a new ad campaign in minutes: set your budget, choose your target audience by region and interests, then upload your creative assets.',
                        },
                        {
                            target: '.tour-manage-campaigns',
                            title: 'Manage Campaigns',
                            content: 'Review all your campaigns in one list. Pause, resume or duplicate high-performing campaigns without re-entering all details from scratch.',
                        },
                        {
                            target: '.tour-ads-analytics',
                            title: 'Performance Insights',
                            content: 'Analyze CTR, CPC and impression trends to understand which campaigns are delivering ROI and where to reallocate your budget.',
                        },
                        {
                            target: '.tour-ads-billing',
                            title: 'Finance & Spend History',
                            content: 'View your full ad spend history, download invoices for accounting and top up your ad wallet to keep campaigns running without interruption.',
                        }
                    ]}
                />
            )}

        </div>
    );
}
