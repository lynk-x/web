"use client";
import { getErrorMessage } from '@/utils/error';

import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import Link from 'next/link';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import SystemBannerSpotlight from '@/components/shared/SystemBannerSpotlight';
import ProductTour from '@/components/dashboard/ProductTour';
import { formatCurrency } from '@/utils/format';

/**
 * Commercial command center overview page.
 * Displays high-level campaign stats, budget pacing, spotlights and quick access navigation for sponsors and advertisers.
 */
export default function CommercialDashboard() {
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
    /** What active campaigns have spent so far in one currency, against the sum of their total budgets. */
    interface BudgetUse {
        currency: string;
        spent: number;
        budget: number;
    }
    const [budgetUse, setBudgetUse] = useState<BudgetUse[]>([]);
    interface DashboardStat {
        label: string;
        value: string | null;
        change: string;
    }
    const [stats, setStats] = useState<DashboardStat[]>([
        { label: 'Total Campaigns', value: null, change: 'Lifetime count' },
        { label: 'Active Campaigns', value: null, change: 'Running now' },
        { label: 'Pending Approval', value: null, change: 'Under review' },
        { label: 'Team Size', value: null, change: 'Account members' },
    ]);

    /**
     * Sums spend and budget across the account's active campaigns, one row per currency so mixed-currency accounts
     * are never blended. Uses the same campaigns RPC as the campaigns page; a failure only hides the card.
     */
    const loadBudgetUse = useCallback(async (accountId: string): Promise<BudgetUse[]> => {
        try {
            const { data, error } = await supabase.schema('api').rpc('get_campaigns', {
                p_account_id: accountId,
                p_params: { status: 'active', limit: 100, offset: 0 },
            });
            if (error) throw error;

            const totals = new Map<string, BudgetUse>();
            for (const c of (data?.items ?? []) as { currency: string; spent_amount: number | string; total_budget: number | string }[]) {
                const row = totals.get(c.currency) ?? { currency: c.currency, spent: 0, budget: 0 };
                row.spent += Number(c.spent_amount) || 0;
                row.budget += Number(c.total_budget) || 0;
                totals.set(c.currency, row);
            }
            return [...totals.values()].sort((a, b) => b.spent - a.spent);
        } catch {
            return [];
        }
    }, [supabase]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!activeAccount) return;
            setIsLoading(true);
            try {
                const { data, error } = await supabase.schema('api').rpc('get_campaign_stats', { 
                    p_account_id: activeAccount.id 
                });

                if (error) throw error;

                const ds = data.stats || {};
                setStats([
                    { label: 'Total Campaigns', value: (ds.total_campaigns || 0).toLocaleString(), change: 'Lifetime count' },
                    { label: 'Active Campaigns', value: (ds.active_campaigns || 0).toLocaleString(), change: 'Running now' },
                    { label: 'Pending Approval', value: (ds.pending_approval || 0).toLocaleString(), change: 'Under review' },
                    { label: 'Team Size', value: (ds.team_size || 0).toLocaleString(), change: 'Account members' },
                ]);

                setSpotlights(data.spotlights || []);
                setBudgetUse(await loadBudgetUse(activeAccount.id));
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
                    { label: 'Team Size', value: '0', change: 'Account members' },
                ]);
                setIsLoading(false);
            }
        }
    }, [activeAccount, isOrgLoading, supabase, showToast, loadBudgetUse]);
    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title={activeAccount ? `Welcome back, ${activeAccount.name}👋` : 'Hi there👋...Ready to advertise with us?'}
                subtitle="Manage your campaigns and track performance."
            />

            {budgetUse.length > 0 && (
                <section className={styles.pacingCard} aria-label="Active campaign budget">
                    <h2 className={styles.pacingTitle}>Active campaign budget</h2>
                    {budgetUse.map((p) => {
                        const pct = p.budget > 0 ? Math.min(100, (p.spent / p.budget) * 100) : null;
                        return (
                            <div key={p.currency} className={styles.pacingRow}>
                                <div className={styles.pacingNumbers}>
                                    <span className={styles.pacingSpent}>{formatCurrency(p.spent, p.currency)}</span>
                                    <span className={styles.pacingCap}>
                                        {`spent of ${formatCurrency(p.budget, p.currency)} budget`}
                                    </span>
                                </div>
                                {pct !== null && (
                                    <div
                                        className={styles.pacingBar}
                                        role="progressbar"
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={Math.round(pct)}
                                        aria-label={`${p.currency} spend against the campaign budget`}
                                    >
                                        <div className={styles.pacingBarFill} style={{ width: `${pct}%` }} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <Link href="/dashboard/ads/finance" className={styles.pacingAction}>Top up wallet</Link>
                </section>
            )}

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
                            title: 'Ads Manager',
                            content: 'Welcome to your Ads Manager. Launch targeted campaigns and sponsorships that reach thousands of Lynk-X attendees across our forums right when they are browsing.',
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
                            content: 'Create a new campaign in minutes: set your budget, choose your target audience by region and interests, then upload your creative assets.',
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
                            content: 'View your full spend history, download invoices for accounting and top up your wallet to keep campaigns running without interruption.',
                        }
                    ]}
                />
            )}

        </div>
    );
}
