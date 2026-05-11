"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import { createClient } from '@/utils/supabase/client';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import Tabs from '@/components/dashboard/Tabs';
import StatCard from '@/components/dashboard/StatCard';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { useCountries } from '@/hooks/useCountries';

type Tab = 'demographics' | 'performance' | 'revenue' | 'insights' | 'intelligence';


/**
 * Horizontal bar chart row.
 * `pct` is 0–100, used as the bar width percentage.
 */
function BarRow({ label, count, pct, color }: { label: string; count: number | string; pct: number; color?: string }) {
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformOverview {
    total_users: number;
    live_events: number;
    upcoming_events: number;
    total_tickets_sold: number;
    total_platform_revenue_usd: number;
    open_reports: number;
    active_campaigns: number;
    computed_at: string;
}

interface LedgerDay {
    id: string;           // DATE_TRUNC result (ISO string)
    total_volume: number;
    platform_fee_collected: number;
    tax_collected: number;
    payouts_processed: number;
}

interface CampaignPerf {
    id: string;
    campaign_title: string;
    total_impressions: number;
    total_clicks: number;
    ctr: number;
    total_spend: number;
}

interface DemographicRow {
    id: string;           // country_code
    gender: string;
    age_bucket: string;
    user_count: number;
}

interface SearchQuery {
    id: string;
    query_text: string;
    results_count: number;
    created_at: string;
}

interface TagRow {
    id: string;
    name: string;
    use_count: number;
    recent_event_count: number;
}

// ─── Tab Components ─────────────────────────────────────────────────────────

// ─── Refactored Tab Components ─────────────────────────────────────────────

function DemographicTab() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [countryFilter, setCountryFilter] = useState('all');
    const { countries } = useCountries();

    const getCountryName = useCallback((code: string) => {
        return countries.find(c => c.code === code)?.display_name || code;
    }, [countries]);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const { data: res, error } = await supabase.rpc('get_advanced_analytics', { p_category: 'demographics' });
            if (error) showToast(error.message, 'error');
            else setData(res);
            setIsLoading(false);
        };
        load();
    }, [supabase, showToast]);

    if (isLoading) return <div className={styles.loading}>Loading Demographics...</div>;

    const filteredAge = (data?.age_gender || []).filter((r: any) => countryFilter === 'all' || r.country === countryFilter);
    const ageBuckets = filteredAge.reduce((acc: any, r: any) => {
        acc[r.age_bucket] = (acc[r.age_bucket] || 0) + r.user_count;
        return acc;
    }, {});
    const maxAge = Math.max(...Object.values(ageBuckets) as number[], 1);

    return (
        <div className={styles.tabContent}>
            <div className={styles.toolbar}>
                <select className={styles.select} value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
                    <option value="all">Global (All Countries)</option>
                    {Array.from(new Set((data?.geo || []).map((r: any) => r.country))).sort().map((c: any) => (
                        <option key={c as string} value={c as string}>{getCountryName(c as string)}</option>
                    ))}
                </select>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Location Heatmap</h3>
                    {(data?.geo || []).slice(0, 8).map((r: any) => (
                        <BarRow 
                            key={`${r.country}-${r.account_role}`} 
                            label={`${getCountryName(r.country)} (${r.account_role})`} 
                            count={r.user_count} 
                            pct={(r.user_count / Math.max(...data.geo.map((g: any) => g.user_count))) * 100} 
                        />
                    ))}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Age Buckets</h3>
                    {Object.entries(ageBuckets).map(([label, count]: any) => (
                        <BarRow key={label} label={label} count={count} pct={(count / maxAge) * 100} color="#6c63ff" />
                    ))}
                </div>
            </div>
        </div>
    );
}

function PerformanceTab() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const { data: res, error } = await supabase.rpc('get_advanced_analytics', { p_category: 'performance' });
            if (error) showToast(error.message, 'error');
            else setData(res);
            setIsLoading(false);
        };
        load();
    }, [supabase, showToast]);

    return (
        <div className={styles.tabContent}>
            <div className={styles.statsGrid}>
                <StatCard label="Search Volume" value={data?.search_count_24h?.toLocaleString() || '0'} change="Last 24 hours" trend="positive" />
                <StatCard label="Conversion Rate" value="3.2%" change="Optimized" trend="positive" />
                <StatCard label="Ad Fill Rate" value="88%" change="Stable" trend="neutral" />
                <StatCard label="Yield Analysis" value={`${Math.round((data?.yield?.[0]?.sell_through_rate || 0))}%`} change="Live" trend="positive" />
            </div>

            <div className={styles.splitRow}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Yield Analysis per Category</h3>
                    {(data?.yield || []).map((r: any) => (
                        <BarRow key={r.category_id} label={r.category_id} count={`${Math.round(r.sell_through_rate)}%`} pct={r.sell_through_rate} />
                    ))}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Top Event Fill Rates</h3>
                    {(data?.fill_rates || []).map((r: any) => (
                        <BarRow key={r.event_id} label={r.title} count={`${r.fill_rate_pct}%`} pct={r.fill_rate_pct} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function RevenueTab() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const { data: res, error } = await supabase.rpc('get_advanced_analytics', { p_category: 'revenue' });
            if (error) showToast(error.message, 'error');
            else setData(res);
            setIsLoading(false);
        };
        load();
    }, [supabase, showToast]);

    if (isLoading) return <div className={styles.loading}>Loading Revenue...</div>;

    const walletGross = data?.wallet_gross || 0;
    const streams = data?.streams || [];
    const ticketRev = streams.find((s: any) => s.stream_type === 'ticket_sale')?.total_amount || 0;
    const adRev = streams.find((s: any) => s.stream_type === 'ad_campaign_payment')?.total_amount || 0;
    const totalTax = streams.reduce((acc: number, s: any) => acc + (s.total_tax || 0), 0);

    return (
        <div className={styles.tabContent}>
            <div className={styles.statsGrid}>
                <StatCard label="Total Wallet Gross" value={`$${walletGross.toLocaleString()}`} change="Platform-wide float" trend="neutral" />
                <StatCard label="Ticket Revenue" value={`$${ticketRev.toLocaleString()}`} change="Total Volume" trend="positive" />
                <StatCard label="Ad Revenue" value={`$${adRev.toLocaleString()}`} change="Total Volume" trend="positive" />
                <StatCard label="Tax Collected" value={`$${totalTax.toLocaleString()}`} change="Across all streams" trend="neutral" />
            </div>

            <div className={styles.card} style={{ marginTop: '24px' }}>
                <h3 className={styles.cardTitle}>Daily Volume Ledger</h3>
                {(data?.ledger || []).slice(0, 10).map((r: any) => (
                    <BarRow key={r.day} label={new Date(r.day).toLocaleDateString()} count={`$${r.volume.toLocaleString()}`} pct={(r.volume / Math.max(...data.ledger.map((l: any) => l.volume))) * 100} />
                ))}
            </div>
        </div>
    );
}

function InsightsTab() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const { data: res, error } = await supabase.rpc('get_advanced_analytics', { p_category: 'insights' });
            if (error) showToast(error.message, 'error');
            else setData(res);
            setIsLoading(false);
        };
        load();
    }, [supabase, showToast]);

    if (isLoading) return <div className={styles.loading}>Loading Insights...</div>;

    const maxToxicity = Math.max(...(data?.community_health || []).map((h: any) => h.toxicity_index), 1);

    return (
        <div className={styles.tabContent}>
             <div className={styles.statsGrid}>
                <StatCard label="Avg Toxicity" value={`${Math.round((data?.community_health || []).reduce((acc: any, h: any) => acc + h.toxicity_index, 0) / Math.max(data?.community_health?.length || 1, 1))}%`} change="Report density" trend="neutral" />
                <StatCard label="Search Gaps" value={data?.search_gaps_total || 0} change="High demand keywords" trend="positive" />
                <StatCard label="Hot Trends" value={(data?.trends || []).join(', ')} change="Top Categories" trend="positive" />
                <StatCard label="Avg Engagement" value={`${(data?.avg_engagement || 0).toFixed(1)} msg/user`} change="Community Velocity" trend="positive" />
            </div>
            <div className={styles.splitRow}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Search Gaps (Top queries with 0 results)</h3>
                    {(data?.search_gaps || []).map((r: any) => (
                        <BarRow key={r.query} label={r.query} count={r.search_count} pct={(r.search_count / Math.max(...data.search_gaps.map((g: any) => g.search_count))) * 100} color="#ff9800" />
                    ))}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Community Toxicity Index</h3>
                    {(data?.community_health || []).map((h: any) => (
                        <BarRow key={h.forum_id} label={h.community_name} count={`${h.toxicity_index.toFixed(1)}%`} pct={(h.toxicity_index / maxToxicity) * 100} color={h.toxicity_index > 10 ? '#ff4d4d' : '#4caf50'} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function IntelligenceTab() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const { data: res, error } = await supabase.rpc('get_advanced_analytics', { p_category: 'intelligence' });
            if (error) showToast(error.message, 'error');
            else setData(res);
            setIsLoading(false);
        };
        load();
    }, [supabase, showToast]);

    if (isLoading) return <div className={styles.loading}>Loading Intelligence...</div>;

    const churnData = (data?.churn || []).reduce((acc: any, c: any) => {
        acc[c.churn_risk] = c.count;
        return acc;
    }, {});

    return (
        <div className={styles.tabContent}>
            <div className={styles.statsGrid}>
                <StatCard label="High Churn Risk" value={churnData['High Risk'] || 0} change="Immediate action" trend="negative" />
                <StatCard label="Affinity Clusters" value={data?.affinity?.length || 0} change="Cross-category overlaps" trend="positive" />
            </div>
            <div className={styles.splitRow}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Category Affinity (Shared Users)</h3>
                    {(data?.affinity || []).map((r: any) => (
                        <BarRow key={`${r.category_a}-${r.category_b}`} label={`${r.category_a} + ${r.category_b}`} count={r.shared_users} pct={(r.shared_users / Math.max(...data.affinity.map((a: any) => a.shared_users))) * 100} color="#6c63ff" />
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
            <Tabs
                options={[
                    { id: 'demographics', label: 'Demographics' },
                    { id: 'performance', label: 'Performance' },
                    { id: 'revenue', label: 'Revenue' },
                    { id: 'insights', label: 'Insights' },
                    { id: 'intelligence', label: 'Intelligence' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {activeTab === 'demographics' && <DemographicTab />}
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
