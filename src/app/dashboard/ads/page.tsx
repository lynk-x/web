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

export default function AdsDashboard() {
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const [isLoading, setIsLoading] = useState(true);
    const [spotlights, setSpotlights] = useState<any[]>([]);
    const [stats, setStats] = useState<any[]>([
        { label: 'Total Campaigns', value: null, isPositive: true },
        { label: 'Active Campaigns', value: null, isPositive: true },
        { label: 'Pending Approval', value: null, isPositive: true },
        { label: 'Remaining Budget', value: null, isPositive: true },
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

                const currency = activeAccount?.default_currency || 'KES';

                setStats([
                    { label: 'Total Campaigns', value: totalCampaigns.toLocaleString(), isPositive: true },
                    { label: 'Active Campaigns', value: activeCampaigns.toLocaleString(), isPositive: true },
                    { label: 'Pending Approval', value: pendingApproval.toLocaleString(), isPositive: true },
                    { label: 'Remaining Budget', value: formatCurrency(remainingBudget, currency), isPositive: true },
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
                    { label: 'Total Campaigns', value: '0', isPositive: true },
                    { label: 'Active Campaigns', value: '0', isPositive: true },
                    { label: 'Pending Approval', value: '0', isPositive: true },
                    { label: 'Remaining Budget', value: formatCurrency(0), isPositive: true },
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
            <div className={sharedStyles.statsGrid}>
                {stats.map((stat, index) => (
                    <StatCard
                        key={index}
                        label={stat.label}
                        value={stat.value}
                        change="Real-time data"
                        trend="neutral"
                        isLoading={isLoading}
                    />
                ))}
            </div>

            {/* Quick Actions */}
            <section className={styles.quickActions}>
                <h2 className={sharedStyles.sectionTitle}>Quick Actions</h2>
                <div className={styles.actionsGrid}>
                    <Link href="/dashboard/ads/campaigns/create" className={styles.actionCard}>
                        <span className={styles.actionLabel}>Create Campaign</span>
                    </Link>
                    <Link href="/dashboard/ads/campaigns" className={styles.actionCard}>
                        <span className={styles.actionLabel}>Manage Campaigns</span>
                    </Link>
                    <Link href="/dashboard/ads/analytics" className={styles.actionCard}>
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

        </div>
    );
}
