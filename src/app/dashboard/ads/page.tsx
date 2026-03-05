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

export default function AdsDashboard() {
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<any[]>([
        { label: 'Total Spend', value: null, isPositive: true },
        { label: 'Impressions', value: null, isPositive: true },
        { label: 'Clicks', value: null, isPositive: true },
        { label: 'Avg. CTR', value: null, isPositive: true },
    ]);

    useEffect(() => {
        const fetchStats = async () => {
            if (!activeAccount) return;
            setIsLoading(true);
            try {
                // Get all campaign IDs for this account
                const { data: campaigns } = await supabase
                    .from('ad_campaigns')
                    .select('id, spent_amount')
                    .eq('account_id', activeAccount.id);

                const campaignIds = (campaigns || []).map(c => c.id);
                const totalSpend = (campaigns || []).reduce((acc, c) => acc + Number(c.spent_amount || 0), 0);

                const currency = activeAccount?.default_currency || 'KES';
                if (campaignIds.length === 0) {
                    setStats([
                        { label: 'Total Spend', value: formatCurrency(0, currency), isPositive: true },
                        { label: 'Impressions', value: '0', isPositive: true },
                        { label: 'Clicks', value: '0', isPositive: true },
                        { label: 'Avg. CTR', value: '0.00%', isPositive: true },
                    ]);
                    return;
                }

                // Get analytics for these campaigns
                const { data: analytics } = await supabase
                    .from('ad_analytics')
                    .select('interaction_type')
                    .in('campaign_id', campaignIds);

                const impressions = (analytics || []).filter(a => a.interaction_type === 'impression').length;
                const clicks = (analytics || []).filter(a => a.interaction_type === 'click').length;
                const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

                setStats([
                    { label: 'Total Spend', value: formatCurrency(totalSpend, currency), isPositive: true },
                    { label: 'Impressions', value: impressions.toLocaleString(), isPositive: true },
                    { label: 'Clicks', value: clicks.toLocaleString(), isPositive: true },
                    { label: 'Avg. CTR', value: `${ctr.toFixed(2)}%`, isPositive: true },
                ]);
            } catch (error) {
                console.error('Error fetching ads stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (!isOrgLoading) {
            if (activeAccount) {
                fetchStats();
            } else {
                setStats([
                    { label: 'Total Spend', value: formatCurrency(0), isPositive: true },
                    { label: 'Impressions', value: '0', isPositive: true },
                    { label: 'Clicks', value: '0', isPositive: true },
                    { label: 'Avg. CTR', value: '0.00%', isPositive: true },
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

        </div>
    );
}
