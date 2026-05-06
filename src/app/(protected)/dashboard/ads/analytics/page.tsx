"use client";
import { getErrorMessage } from '@/utils/error';

import styles from './page.module.css';
import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/utils/format';
import StatCard from '@/components/dashboard/StatCard';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import ProductTour from '@/components/dashboard/ProductTour';

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
            const { data, error } = await supabase.rpc('get_ads_performance_metrics', {
                p_account_id: activeAccount.id,
                p_days: timeRange
            });

            if (error) throw error;

            const results = data || [];
            const impressions = results.reduce((acc: number, r: any) => acc + Number(r.impressions), 0);
            const clicks = results.reduce((acc: number, r: any) => acc + Number(r.clicks), 0);
            const totalCost = results.reduce((acc: number, r: any) => acc + Number(r.total_cost), 0);

            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const cpc = clicks > 0 ? totalCost / clicks : 0;

            setKpis({
                impressions: impressions.toLocaleString(),
                clicks: clicks.toLocaleString(),
                ctr: `${ctr.toFixed(2)}%`,
                cpc: formatCurrency(cpc)
            });

            const formatted = results.map((r: any) => {
                const date = new Date(r.day);
                const label = timeRange <= 7
                    ? date.toLocaleDateString('en-US', { weekday: 'short' })
                    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return {
                    name: label,
                    impressions: Number(r.impressions),
                    clicks: Number(r.clicks),
                    sortKey: date.getTime()
                };
            });

            setPerformanceData(formatted);
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to fetch analytics', 'error');
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
            <PageHeader
                title="Ads Analytics"
                subtitle="Analyze your campaign reach and performance."
                customAction={
                    <select
                        className={`${styles.dateRangeBtn} tour-ads-analytics-range`}
                        value={timeRange}
                        onChange={(e) => handleRangeChange(Number(e.target.value))}
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={90}>Last 90 Days</option>
                    </select>
                }
            />

            {/* Overview Cards */}
            <div className={`${sharedStyles.statsGrid} tour-ads-analytics-stats`}>
                <StatCard
                    label="Total Impressions"
                    value={kpis.impressions}
                    change="Ad visibility"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Total Clicks"
                    value={kpis.clicks}
                    change="User interactions"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Click-Through Rate"
                    value={kpis.ctr}
                    change="Performance (%)"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Cost Per Click"
                    value={kpis.cpc}
                    change="Avg. efficiency"
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

            <ProductTour
                storageKey={activeAccount ? `hasSeenAdsAnalyticsJoyride_${activeAccount.id}` : 'hasSeenAdsAnalyticsJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Performance Intelligence',
                        content: 'This page provides real-time data on how your ads are performing across the Lynk-X ecosystem.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-ads-analytics-range',
                        title: 'Historical Trends',
                        content: 'Choose your measurement window to see how your campaigns have evolved over time.',
                    },
                    {
                        target: '.tour-ads-analytics-stats',
                        title: 'Success Metrics',
                        content: 'Monitor Click-Through Rate (CTR) and Cost Per Click (CPC) to measure the effectiveness and efficiency of your ad spend.',
                    },
                    {
                        target: `.${styles.chartSection}`,
                        title: 'Visualizing Growth',
                        content: 'The performance chart shows impressions and clicks over time, helping you identify peak engagement periods.',
                    }
                ]}
            />
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
