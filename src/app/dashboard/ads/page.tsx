"use client";

import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import Link from 'next/link';
import React, { useState, useEffect, useMemo } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency } from '@/utils/format';
import SystemBannerSpotlight from '@/components/shared/SystemBannerSpotlight';
import ProductTour from '@/components/dashboard/ProductTour';

export default function AdsDashboard() {
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const [isLoading, setIsLoading] = useState(true);
    const [spotlights, setSpotlights] = useState<any[]>([]);
    const [stats, setStats] = useState<any[]>([
        { label: 'Total Campaigns', value: null, change: 'Lifetime count' },
        { label: 'Active Campaigns', value: null, change: 'Running now' },
        { label: 'Pending Approval', value: null, change: 'Under review' },
        { label: 'Remaining Budget', value: null, change: 'Available funds' },
    ]);

    useEffect(() => {
        const fetchStats = async () => {
            if (!activeAccount) return;
            setIsLoading(true);
            try {
                // Fetch stats and spotlights
                const [adsRes, spotlightsRes] = await Promise.all([
                    supabase
                        .from('ad_campaigns')
                        .select('id, status, total_budget, spent_amount')
                        .eq('account_id', activeAccount.id),
                    supabase
                        .from('spotlights')
                        .select('*')
                        .in('target', ['all', 'ads_dashboard'])
                        .eq('is_active', true)
                        .order('display_order', { ascending: true })
                ]);

                if (adsRes.error) throw adsRes.error;

                const allAds = adsRes.data || [];
                const totalCampaigns = allAds.length;
                const activeCampaigns = allAds.filter((c: any) => c.status === 'active').length;
                const pendingApproval = allAds.filter((c: any) => c.status === 'pending_approval').length;
                const remainingBudget = allAds.reduce((acc: number, c: any) => acc + (Number(c.total_budget || 0) - Number(c.spent_amount || 0)), 0);

                const currency = 'USD';

                setStats([
                    { label: 'Total Campaigns', value: totalCampaigns.toLocaleString(), change: 'Lifetime count' },
                    { label: 'Active Campaigns', value: activeCampaigns.toLocaleString(), change: 'Running now' },
                    { label: 'Pending Approval', value: pendingApproval.toLocaleString(), change: 'Under review' },
                    { label: 'Remaining Budget', value: formatCurrency(remainingBudget, currency), change: 'Available funds' },
                ]);

                if (spotlightsRes.data) {
                    setSpotlights(spotlightsRes.data.map((s: any) => ({
                        id: s.id,
                        title: s.title,
                        subtitle: s.subtitle,
                        backgroundImage: s.background_url,
                        ctaLabel: s.cta_text,
                        ctaHref: s.redirect_to
                    })));
                }
            } catch (error) {
                console.error('Error fetching ads dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (!isOrgLoading) {
            if (activeAccount) {
                fetchStats();
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
    }, [activeAccount, isOrgLoading, supabase]);
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
            <section className={styles.quickActions}>
                <h2 className={sharedStyles.sectionTitle}>Quick Actions</h2>
                <div className={styles.actionsGrid}>
                    <Link href="/dashboard/ads/campaigns/create" className={`${styles.actionCard} tour-create-campaign`}>
                        <span className={styles.actionLabel}>Create Campaign</span>
                    </Link>
                    <Link href="/dashboard/ads/campaigns" className={styles.actionCard}>
                        <span className={styles.actionLabel}>Manage Campaigns</span>
                    </Link>
                    <Link href="/dashboard/ads/analytics" className={`${styles.actionCard} tour-ads-analytics`}>
                        <span className={styles.actionLabel}>View Analytics</span>
                    </Link>
                    <Link href="/dashboard/ads/assets" className={styles.actionCard}>
                        <span className={styles.actionLabel}>Creative Library</span>
                    </Link>
                    <Link href="/dashboard/ads/billing" className={styles.actionCard}>
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

            <ProductTour
                storageKey={activeAccount ? `hasSeenAdsJoyride_${activeAccount.id}` : 'hasSeenAdsJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Welcome to Ads Manager!',
                        content: 'Promote your business and reach a wider audience across Lynk-X.',
                        disableBeacon: true,
                    },
                    {
                        target: '.tour-ads-stats',
                        title: 'Campaign Performance',
                        content: 'Monitor your active campaigns and track your remaining budget at a glance.',
                    },
                    {
                        target: '.tour-create-campaign',
                        title: 'Launch a campaign',
                        content: 'Select your target audience, set your budget, and go live with a new ad.',
                    },
                    {
                        target: '.tour-ads-analytics',
                        title: 'Deep dive into data',
                        content: 'See exactly how your ads are performing with detailed analytics.',
                    }
                ]}
            />

        </div>
    );
}
