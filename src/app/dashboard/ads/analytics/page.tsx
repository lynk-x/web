"use client";

import styles from './page.module.css';
import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/utils/format';
import StatCard from '@/components/dashboard/StatCard';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

function AnalyticsContent() {
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const [isLoading, setIsLoading] = useState(true);
    const initialRange = Number(searchParams.get('range')) || 7;
    const [timeRange, setTimeRange] = useState(initialRange);
    const [performanceData, setPerformanceData] = useState<any[]>([]);
    const [kpis, setKpis] = useState({
        impressions: '0',
        clicks: '0',
        ctr: '0.00%',
        cpc: '$0.00'
    });

    const fetchAnalytics = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            // Get all campaign IDs for this account
            const { data: campaigns } = await supabase
                .from('ad_campaigns')
                .select('id')
                .eq('account_id', activeAccount.id);

            const campaignIds = (campaigns || []).map(c => c.id);
            if (campaignIds.length === 0) {
                setPerformanceData([]);
                setKpis({
                    impressions: '0',
                    clicks: '0',
                    ctr: '0.00%',
                    // Use formatCurrency so the symbol matches the account's currency
                    cpc: formatCurrency(0)
                });
                setIsLoading(false);
                return;
            }

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - timeRange);

            const { data: analytics, error } = await supabase
                .from('ad_analytics')
                .select('*')
                .in('campaign_id', campaignIds)
                .gte('created_at', startDate.toISOString());

            if (error) throw error;

            // Process KPIs
            const impressions = analytics.filter(a => a.interaction_type === 'impression');
            const clicks = analytics.filter(a => a.interaction_type === 'click');
            const totalCost = analytics.reduce((acc, a) => acc + Number(a.cost_charged || 0), 0);

            const ctr = impressions.length > 0 ? (clicks.length / impressions.length) * 100 : 0;
            const cpc = clicks.length > 0 ? totalCost / clicks.length : 0;

            setKpis({
                impressions: impressions.length.toLocaleString(),
                clicks: clicks.length.toLocaleString(),
                ctr: `${ctr.toFixed(2)}%`,
                cpc: formatCurrency(cpc)
            });

            // Build a day-bucket map keyed by ISO date string (YYYY-MM-DD) so that entries
            // from different weeks on a 30/90-day range don't collide on the same weekday key.
            const daysMap: Record<string, { name: string; impressions: number; clicks: number; sortKey: number }> = {};
            for (let i = timeRange - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                // ISO key prevents weekday collisions across weeks
                const isoKey = d.toISOString().slice(0, 10);
                // Display label: e.g. "Mar 4" for long ranges, weekday for 7-day
                const label = timeRange <= 7
                    ? d.toLocaleDateString('en-US', { weekday: 'short' })
                    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                daysMap[isoKey] = { name: label, impressions: 0, clicks: 0, sortKey: d.getTime() };
            }

            analytics.forEach(a => {
                const isoKey = new Date(a.created_at).toISOString().slice(0, 10);
                if (daysMap[isoKey]) {
                    if (a.interaction_type === 'impression') daysMap[isoKey].impressions++;
                    if (a.interaction_type === 'click') daysMap[isoKey].clicks++;
                }
            });

            setPerformanceData(Object.values(daysMap).sort((a, b) => a.sortKey - b.sortKey));

        } catch (error: any) {
            showToast(error.message || 'Failed to fetch analytics', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, timeRange, showToast]);

    useEffect(() => {
        if (!isOrgLoading) {
            if (activeAccount) {
                fetchAnalytics();
            } else {
                setIsLoading(false);
            }
        }
    }, [isOrgLoading, activeAccount, fetchAnalytics]);

    useEffect(() => {
        const range = searchParams.get('range');
        if (range) {
            setTimeRange(Number(range));
        }
    }, [searchParams]);

    const handleRangeChange = (newRange: number) => {
        setTimeRange(newRange);
        const params = new URLSearchParams(searchParams.toString());
        params.set('range', newRange.toString());
        router.replace(`${pathname}?${params.toString()}`);
    };
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Analytics</h1>
                <select
                    className={styles.dateRangeBtn}
                    value={timeRange}
                    onChange={(e) => handleRangeChange(Number(e.target.value))}
                >
                    <option value={7}>Last 7 Days</option>
                    <option value={30}>Last 30 Days</option>
                    <option value={90}>Last 90 Days</option>
                </select>
            </header>

            {/* Overview Cards */}
            <div className={sharedStyles.statsGrid}>
                <StatCard
                    label="Total Impressions"
                    value={kpis.impressions}
                    change="Real-time"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Total Clicks"
                    value={kpis.clicks}
                    change="Real-time"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Click-Through Rate"
                    value={kpis.ctr}
                    change="Real-time"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Cost Per Click"
                    value={kpis.cpc}
                    change="Real-time"
                    trend="positive"
                    isLoading={isLoading}
                />
            </div>

            {/* Main Chart */}
            <div className={styles.chartSection}>
                <h2 className={styles.sectionTitle}>Performance Over Time</h2>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <AreaChart
                            data={performanceData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#20f928" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#20f928" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorClick" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="rgba(255, 255, 255, 0.4)" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="rgba(255, 255, 255, 0.4)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                            <Legend />
                            <Area type="monotone" dataKey="impressions" stroke="#20f928" fillOpacity={1} fill="url(#colorImp)" strokeWidth={2} />
                            <Area type="monotone" dataKey="clicks" stroke="rgba(255, 255, 255, 0.4)" fillOpacity={1} fill="url(#colorClick)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    return (
        <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>Loading Analytics...</div>}>
            <AnalyticsContent />
        </Suspense>
    );
}
