"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import DataTable from '@/components/shared/DataTable';
import { useToast } from '@/components/ui/Toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/shared/Tabs';
import StatCard from '@/components/dashboard/StatCard';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { useCountries } from '@/hooks/useCountries';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';

type Tab = 'demographics' | 'performance' | 'revenue' | 'insights' | 'intelligence';

/**
 * Horizontal bar chart row.
 * `pct` is 0–100, used as the bar width percentage.
 */
interface BarRowProps {
    label: string;
    count: number | string;
    pct: number;
    color?: string;
}

function BarRow({ label, count, pct, color }: BarRowProps) {
    return (
        <div className={styles.barRow}>
            <span className={styles.barLabel} title={label}>{label}</span>
            <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${pct}%`, background: color ?? 'var(--color-brand-primary)' }} />
            </div>
            <span className={styles.barValue}>{count.toLocaleString()}</span>
        </div>
    );
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface AgeGenderRow {
    country: string;
    age_bucket: string;
    gender: string;
    user_count: number;
}

interface GeoRow {
    country: string;
    account_role: string;
    user_count: number;
}

interface DemographicData {
    age_gender: AgeGenderRow[];
    geo: GeoRow[];
}

interface YieldRow {
    category_id: string;
    sell_through_rate: number;
}

interface FillRateRow {
    event_id: string;
    title: string;
    fill_rate_pct: number;
}

interface PerformanceData {
    search_count_24h: number;
    yield: YieldRow[];
    fill_rates: FillRateRow[];
}

interface StreamRow {
    stream_type: string;
    total_amount: number;
    total_tax?: number;
}

interface LedgerRow {
    day: string;
    volume: number;
}

interface RevenueData {
    wallet_gross: number;
    streams: StreamRow[];
    ledger: LedgerRow[];
}

interface CommunityHealthRow {
    forum_id: string;
    community_name: string;
    toxicity_index: number;
}

interface SearchGapRow {
    query: string;
    search_count: number;
}

interface InsightsData {
    community_health: CommunityHealthRow[];
    search_gaps_total: number;
    search_gaps: SearchGapRow[];
    trends: string[];
    avg_engagement: number;
}

interface ChurnRow {
    churn_risk: string;
    count: number;
}

interface AffinityRow {
    category_a: string;
    category_b: string;
    shared_users: number;
}

interface IntelligenceData {
    churn: ChurnRow[];
    affinity: AffinityRow[];
}

// ─── Tab Components ─────────────────────────────────────────────────────────

function DemographicTab({ countryFilter }: { countryFilter: string }) {
    const { countries } = useCountries();

    const { data, isLoading } = useSupabaseQuery<DemographicData>(
        ['admin-analytics-demographics'],
        async (supabase) => {
            const { data: res, error } = await supabase.rpc('get_advanced_analytics', { p_category: 'demographics' });
            if (error) throw error;
            return (res as DemographicData | null) || { age_gender: [], geo: [] };
        }
    );

    const getCountryName = useCallback((code: string) => {
        return countries.find(c => c.code === code)?.display_name || code;
    }, [countries]);

    if (isLoading) return <div className={styles.loading}>Loading Demographics...</div>;

    const filteredAge = (data?.age_gender || []).filter(r => countryFilter === 'all' || r.country === countryFilter);
    
    const ageBuckets = filteredAge.reduce<Record<string, number>>((acc, r) => {
        acc[r.age_bucket] = (acc[r.age_bucket] || 0) + r.user_count;
        return acc;
    }, {});
    
    const maxAge = Math.max(...Object.values(ageBuckets), 1);

    return (
        <div className={styles.tabContent}>
            <div className={styles.statsGrid}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Location Heatmap</h3>
                    {(() => {
                        const geoList = data?.geo || [];
                        const geoMax = Math.max(...geoList.map(g => g.user_count), 1);
                        return geoList.slice(0, 8).map(r => (
                            <BarRow 
                                key={`${r.country}-${r.account_role}`} 
                                label={`${getCountryName(r.country)} (${r.account_role})`} 
                                count={r.user_count} 
                                pct={(r.user_count / geoMax) * 100} 
                            />
                        ));
                    })()}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Age Buckets</h3>
                    {Object.entries(ageBuckets).map(([label, count]) => (
                        <BarRow key={label} label={label} count={count} pct={(count / maxAge) * 100} color="#6c63ff" />
                    ))}
                </div>
            </div>
        </div>
    );
}

function PerformanceTab() {
    const { data, isLoading } = useSupabaseQuery<PerformanceData>(
        ['admin-analytics-performance'],
        async (supabase) => {
            const { data: res, error } = await supabase.rpc('get_advanced_analytics', { p_category: 'performance' });
            if (error) throw error;
            return (res as PerformanceData | null) || { search_count_24h: 0, yield: [], fill_rates: [] };
        }
    );

    if (isLoading) return <div className={styles.loading}>Loading Performance...</div>;

    const yieldList = data?.yield || [];
    const fillRatesList = data?.fill_rates || [];
    const searchCount = data?.search_count_24h ?? 0;
    const avgYield = yieldList[0] ? `${Math.round(yieldList[0].sell_through_rate)}%` : '—';

    return (
        <div className={styles.tabContent}>
            <div className={styles.statsGrid}>
                <StatCard label="Search Volume" value={searchCount.toLocaleString()} change="Last 24 hours" trend="positive" />
                <StatCard label="Conversion Rate" value="3.2%" change="Optimized" trend="positive" />
                <StatCard label="Ad Fill Rate" value="88%" change="Stable" trend="neutral" />
                <StatCard label="Yield Analysis" value={avgYield} change="Live" trend="positive" />
            </div>

            <div className={styles.splitRow}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Yield Analysis per Category</h3>
                    {yieldList.map(r => (
                        <BarRow key={r.category_id} label={r.category_id} count={`${Math.round(r.sell_through_rate)}%`} pct={r.sell_through_rate} />
                    ))}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Top Event Fill Rates</h3>
                    {fillRatesList.map(r => (
                        <BarRow key={r.event_id} label={r.title} count={`${r.fill_rate_pct}%`} pct={r.fill_rate_pct} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function RevenueTab() {
    const { data, isLoading } = useSupabaseQuery<RevenueData>(
        ['admin-analytics-revenue'],
        async (supabase) => {
            const { data: res, error } = await supabase.rpc('get_advanced_analytics', { p_category: 'revenue' });
            if (error) throw error;
            return (res as RevenueData | null) || { wallet_gross: 0, streams: [], ledger: [] };
        }
    );

    if (isLoading) return <div className={styles.loading}>Loading Revenue...</div>;

    const walletGross = data?.wallet_gross || 0;
    const streams = data?.streams || [];
    const ledgerList = data?.ledger || [];

    const ticketRev = streams.find(s => s.stream_type === 'ticket_sale')?.total_amount || 0;
    const adRev = streams.find(s => s.stream_type === 'ad_campaign_payment')?.total_amount || 0;
    const totalTax = streams.reduce<number>((acc, s) => acc + (s.total_tax || 0), 0);
    const maxLedgerVolume = Math.max(...ledgerList.map(l => l.volume), 1);

    return (
        <div className={styles.tabContent}>
            <div className={styles.statsGrid}>
                <StatCard label="Total Wallet Gross" value={`KES ${walletGross.toLocaleString()}`} change="Platform-wide float" trend="neutral" />
                <StatCard label="Ticket Revenue" value={`KES ${ticketRev.toLocaleString()}`} change="Total Volume" trend="positive" />
                <StatCard label="Ad Revenue" value={`KES ${adRev.toLocaleString()}`} change="Total Volume" trend="positive" />
                <StatCard label="Tax Collected" value={`KES ${totalTax.toLocaleString()}`} change="Across all streams" trend="neutral" />
            </div>

            <div className={styles.card} style={{ marginTop: '24px' }}>
                <h3 className={styles.cardTitle}>Daily Volume Ledger</h3>
                {ledgerList.slice(0, 10).map(r => (
                    <BarRow key={r.day} label={new Date(r.day).toLocaleDateString()} count={`KES ${r.volume.toLocaleString()}`} pct={(r.volume / maxLedgerVolume) * 100} />
                ))}
            </div>
        </div>
    );
}

function InsightsTab() {
    const { data, isLoading } = useSupabaseQuery<InsightsData>(
        ['admin-analytics-insights'],
        async (supabase) => {
            const { data: res, error } = await supabase.rpc('get_advanced_analytics', { p_category: 'insights' });
            if (error) throw error;
            return (res as InsightsData | null) || { community_health: [], search_gaps_total: 0, search_gaps: [], trends: [], avg_engagement: 0 };
        }
    );

    if (isLoading) return <div className={styles.loading}>Loading Insights...</div>;

    const healthList = data?.community_health || [];
    const searchGapsList = data?.search_gaps || [];
    const searchGapsTotal = data?.search_gaps_total ?? 0;
    const trendsList = data?.trends || [];
    const avgEngagement = data?.avg_engagement ?? 0;

    const maxToxicity = Math.max(...healthList.map(h => h.toxicity_index), 1);
    const maxGapCount = Math.max(...searchGapsList.map(g => g.search_count), 1);
    const avgToxicityPercent = healthList.length > 0
        ? Math.round(healthList.reduce((acc, h) => acc + h.toxicity_index, 0) / healthList.length)
        : 0;

    return (
        <div className={styles.tabContent}>
             <div className={styles.statsGrid}>
                <StatCard label="Avg Toxicity" value={`${avgToxicityPercent}%`} change="Report density" trend="neutral" />
                <StatCard label="Search Gaps" value={searchGapsTotal.toLocaleString()} change="High demand keywords" trend="positive" />
                <StatCard label="Hot Trends" value={trendsList.join(', ') || '—'} change="Top Categories" trend="positive" />
                <StatCard label="Avg Engagement" value={`${avgEngagement.toFixed(1)} msg/user`} change="Community Velocity" trend="positive" />
            </div>
            <div className={styles.splitRow}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Search Gaps (Top queries with 0 results)</h3>
                    {searchGapsList.map(r => (
                        <BarRow key={r.query} label={r.query} count={r.search_count} pct={(r.search_count / maxGapCount) * 100} color="#ff9800" />
                    ))}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Community Toxicity Index</h3>
                    {healthList.map(h => (
                        <BarRow key={h.forum_id} label={h.community_name} count={`${h.toxicity_index.toFixed(1)}%`} pct={(h.toxicity_index / maxToxicity) * 100} color={h.toxicity_index > 10 ? '#ff4d4d' : '#4caf50'} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function IntelligenceTab() {
    const { data, isLoading } = useSupabaseQuery<IntelligenceData>(
        ['admin-analytics-intelligence'],
        async (supabase) => {
            const { data: res, error } = await supabase.rpc('get_advanced_analytics', { p_category: 'intelligence' });
            if (error) throw error;
            return (res as IntelligenceData | null) || { churn: [], affinity: [] };
        }
    );

    if (isLoading) return <div className={styles.loading}>Loading Intelligence...</div>;

    const churnList = data?.churn || [];
    const affinityList = data?.affinity || [];

    const churnData = churnList.reduce<Record<string, number>>((acc, c) => {
        acc[c.churn_risk] = c.count;
        return acc;
    }, {});

    const maxAffinityCount = Math.max(...affinityList.map(a => a.shared_users), 1);

    return (
        <div className={styles.tabContent}>
            <div className={styles.statsGrid}>
                <StatCard label="High Churn Risk" value={(churnData['High Risk'] || 0).toLocaleString()} change="Immediate action" trend="negative" />
                <StatCard label="Affinity Clusters" value={affinityList.length.toLocaleString()} change="Cross-category overlaps" trend="positive" />
            </div>
            <div className={styles.splitRow}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Category Affinity (Shared Users)</h3>
                    {affinityList.map(r => (
                         <BarRow key={`${r.category_a}-${r.category_b}`} label={`${r.category_a} + ${r.category_b}`} count={r.shared_users} pct={(r.shared_users / maxAffinityCount) * 100} color="#6c63ff" />
                    ))}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Churn Risk Segmentation</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>High Risk (30d Inactive)</span><span style={{ color: '#ff4d4d' }}>{churnData['High Risk'] || 0}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Medium Risk (14d Inactive)</span><span style={{ color: '#ff9800' }}>{churnData['Medium Risk'] || 0}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Active / Healthy</span><span style={{ color: '#4caf50' }}>{churnData['Healthy'] || 0}</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Content Component ──────────────────────────────────────────────────────

function AnalyticsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialTab = (searchParams.get('tab') as string) || 'demographics';
    const [activeTab, setActiveTab] = useState<Tab>(
        (['demographics', 'performance', 'revenue', 'insights', 'intelligence'].includes(initialTab) ? initialTab as Tab : 'demographics')
    );
    const [countryFilter, setCountryFilter] = useState('all');
    const { countries } = useCountries();

    useEffect(() => {
        const tab = searchParams.get('tab') as Tab;
        if (tab && ['demographics', 'performance', 'revenue', 'insights', 'intelligence'].includes(tab)) {
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-interface-outline)', marginBottom: 'var(--spacing-md)' }}>
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <div className={sharedStyles.tabsHeaderRow} style={{ marginBottom: 0, borderBottom: 'none' }}>
                        <TabsList>
                            <TabsTrigger value="demographics">Demographics</TabsTrigger>
                            <TabsTrigger value="performance">Performance</TabsTrigger>
                            <TabsTrigger value="revenue">Revenue</TabsTrigger>
                            <TabsTrigger value="insights">Insights</TabsTrigger>
                            <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
                        </TabsList>
                    </div>
                </Tabs>

                <div style={{ paddingBottom: '12px' }}>
                    <select 
                        className={styles.select} 
                        value={countryFilter} 
                        onChange={(e) => setCountryFilter(e.target.value)}
                        style={{ height: '36px', minWidth: '200px' }}
                    >
                        <option value="all">Global (All Countries)</option>
                        {countries.map(c => (
                            <option key={c.code} value={c.code}>{c.display_name} ({c.code})</option>
                        ))}
                    </select>
                </div>
            </div>

            {activeTab === 'demographics' && <DemographicTab countryFilter={countryFilter} />}
            {activeTab === 'performance' && <PerformanceTab />}
            {activeTab === 'revenue' && <RevenueTab />}
            {activeTab === 'insights' && <InsightsTab />}
            {activeTab === 'intelligence' && <IntelligenceTab />}
        </div>
    );
}

/**
 * Admin-only analytics hub.
 * Reads from materialized views (mv_platform_overview, mv_platform_financial_ledger,
 * mv_ad_campaign_performance, mv_platform_demographics, mv_tag_leaderboard)
 * and the live search_analytics table.
 *
 * All MVs are refreshed by cron — this page is intentionally read-only.
 */
export default function AdminAnalyticsPage() {
    return (
        <div className={styles.container}>
            <PageHeader 
                title="Analytics" 
                subtitle="Platform-wide metrics powered by materialized views — refreshed automatically." 
            />

            <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>Loading Analytics...</div>}>
                <AnalyticsContent />
            </Suspense>
        </div>
    );
}
