"use client";

import styles from './page.module.css';
import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/utils/format';

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
                setKpis({ impressions: '0', clicks: '0', ctr: '0.00%', cpc: '$0.00' });
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

            // Process Chart Data (group by day)
            const daysMap: Record<string, any> = {};
            for (let i = 0; i < timeRange; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
                daysMap[dateStr] = { name: dateStr, impressions: 0, clicks: 0, sortKey: d.getTime() };
            }

            analytics.forEach(a => {
                const dateStr = new Date(a.created_at).toLocaleDateString('en-US', { weekday: 'short' });
                if (daysMap[dateStr]) {
                    if (a.interaction_type === 'impression') daysMap[dateStr].impressions++;
                    if (a.interaction_type === 'click') daysMap[dateStr].clicks++;
                }
            });

            setPerformanceData(Object.values(daysMap).sort((a: any, b: any) => a.sortKey - b.sortKey));

        } catch (error: any) {
            showToast(error.message || 'Failed to fetch analytics', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, timeRange, showToast]);

    useEffect(() => {
        if (!isOrgLoading) {
            fetchAnalytics();
        }
    }, [isOrgLoading, fetchAnalytics]);

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
            <div className={styles.overviewCards}>
                <div className={styles.card}>
                    <span className={styles.cardTitle}>Total Impressions</span>
                    <span className={styles.cardValue}>{isLoading ? '...' : kpis.impressions}</span>
                    <span className={`${styles.cardChange} ${styles.positive}`}>Real-time</span>
                </div>
                <div className={styles.card}>
                    <span className={styles.cardTitle}>Total Clicks</span>
                    <span className={styles.cardValue}>{isLoading ? '...' : kpis.clicks}</span>
                    <span className={`${styles.cardChange} ${styles.positive}`}>Real-time</span>
                </div>
                <div className={styles.card}>
                    <span className={styles.cardTitle}>Click-Through Rate</span>
                    <span className={styles.cardValue}>{isLoading ? '...' : kpis.ctr}</span>
                    <span className={`${styles.cardChange} ${styles.positive}`}>Real-time</span>
                </div>
                <div className={styles.card}>
                    <span className={styles.cardTitle}>Cost Per Click</span>
                    <span className={styles.cardValue}>{isLoading ? '...' : kpis.cpc}</span>
                    <span className={`${styles.cardChange} ${styles.positive}`}>Real-time</span>
                </div>
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
