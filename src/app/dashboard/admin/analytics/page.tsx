"use client";

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

type Tab = 'platform' | 'demographics' | 'advertising' | 'search';


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

function PlatformTab() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const [overview, setOverview] = useState<PlatformOverview | null>(null);
    const [ledger, setLedger] = useState<LedgerDay[]>([]);
    const [tags, setTags] = useState<TagRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [ovRes, ledgerRes, tagsRes] = await Promise.all([
                supabase.from('mv_platform_overview').select('*').single(),
                supabase.from('mv_platform_financial_ledger').select('*').order('id', { ascending: false }).limit(30),
                supabase.from('mv_tag_leaderboard').select('*').order('use_count', { ascending: false }).limit(15),
            ]);
            if (ovRes.error) throw ovRes.error;
            if (ledgerRes.error) throw ledgerRes.error;
            if (tagsRes.error) throw tagsRes.error;
            setOverview(ovRes.data);
            setLedger((ledgerRes.data || []).map((r: any) => ({
                id: r.id,
                total_volume: parseFloat(r.total_volume || '0'),
                platform_fee_collected: parseFloat(r.platform_fee_collected || '0'),
                tax_collected: parseFloat(r.tax_collected || '0'),
                payouts_processed: parseFloat(r.payouts_processed || '0'),
            })));
            setTags((tagsRes.data || []).map((r: any) => ({
                id: r.id,
                name: r.name,
                use_count: r.use_count,
                recent_event_count: r.recent_event_count,
            })));
        } catch (err: any) {
            showToast(err.message || 'Failed to load platform data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalVolume = ledger.reduce((acc, d) => acc + d.total_volume, 0);
    const totalFees = ledger.reduce((acc, d) => acc + d.platform_fee_collected, 0);
    const maxFee = Math.max(...ledger.map(d => d.platform_fee_collected), 1);
    const maxTag = Math.max(...tags.map(t => t.use_count), 1);

    if (isLoading) return <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>Loading platform data…</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* ── KPI snapshot ── */}
            {overview && (
                <>
                    <div className={sharedStyles.statsGrid}>
                        <StatCard label="Total Users" value={overview.total_users.toLocaleString()} />
                        <StatCard
                            label="Live Events"
                            value={overview.live_events.toLocaleString()}
                            change={`${overview.upcoming_events.toLocaleString()} upcoming`}
                            trend="neutral"
                        />
                        <StatCard label="Tickets Sold" value={overview.total_tickets_sold.toLocaleString()} />
                        <StatCard
                            label="Platform Revenue"
                            value={`$${Number(overview.total_platform_revenue_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            change="All-time (USD)"
                            trend="neutral"
                        />
                        <StatCard
                            label="Open Reports"
                            value={overview.open_reports.toLocaleString()}
                            change="Needs attention"
                            trend="negative"
                        />
                        <StatCard label="Active Campaigns" value={overview.active_campaigns.toLocaleString()} />
                    </div>
                    <p className={styles.refreshNote}>mv_platform_overview refreshed at {new Date(overview.computed_at).toLocaleTimeString()}</p>
                </>
            )}

            {/* ── Revenue ledger (last 30 days) + trending tags ── */}
            <div className={styles.splitRow}>
                <div className={styles.card}>
                    <div className={styles.sectionTitle}>Platform Fees — Last 30 Days</div>
                    {ledger.slice(0, 14).map(d => (
                        <BarRow
                            key={d.id}
                            label={new Date(d.id).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                            count={`$${d.platform_fee_collected.toFixed(2)}`}
                            pct={(d.platform_fee_collected / maxFee) * 100}
                        />
                    ))}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '12px', fontSize: '13px', opacity: 0.7 }}>
                        Total volume: <strong>${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                        &nbsp;&nbsp;·&nbsp;&nbsp;
                        Platform fees: <strong>${totalFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.sectionTitle}>Trending Tags</div>
                    {tags.map(t => (
                        <BarRow
                            key={t.id}
                            label={t.name}
                            count={t.use_count}
                            pct={(t.use_count / maxTag) * 100}
                            color={t.recent_event_count > 0 ? '#6c63ff' : 'rgba(255,255,255,0.25)'}
                        />
                    ))}
                    <p className={styles.refreshNote}>Purple = active in last 30 days</p>
                </div>
            </div>
        </div>
    );
}

function DemographicsTab() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const [rows, setRows] = useState<DemographicRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('mv_platform_demographics')
                .select('*')
                .order('user_count', { ascending: false });
            if (error) throw error;
            setRows(data || []);
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const byAge = Object.entries(
        rows.reduce<Record<string, number>>((acc, r) => {
            acc[r.age_bucket] = (acc[r.age_bucket] || 0) + r.user_count;
            return acc;
        }, {})
    ).sort((a, b) => b[1] - a[1]);

    const byGender = Object.entries(
        rows.reduce<Record<string, number>>((acc, r) => {
            const label = r.gender ? r.gender.charAt(0).toUpperCase() + r.gender.slice(1) : 'Unknown';
            acc[label] = (acc[label] || 0) + r.user_count;
            return acc;
        }, {})
    ).sort((a, b) => b[1] - a[1]);

    const byCountry = Object.entries(
        rows.reduce<Record<string, number>>((acc, r) => {
            acc[r.id || 'Unknown'] = (acc[r.id || 'Unknown'] || 0) + r.user_count;
            return acc;
        }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 12);

    const maxAge = Math.max(...byAge.map(([, v]) => v), 1);
    const maxGender = Math.max(...byGender.map(([, v]) => v), 1);
    const maxCountry = Math.max(...byCountry.map(([, v]) => v), 1);

    if (isLoading) return <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>Loading demographics…</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className={styles.splitRow}>
                <div className={styles.card}>
                    <div className={styles.sectionTitle}>Age Distribution</div>
                    {byAge.map(([bucket, count]) => (
                        <BarRow key={bucket} label={bucket} count={count} pct={(count / maxAge) * 100} />
                    ))}
                </div>
                <div className={styles.card}>
                    <div className={styles.sectionTitle}>Gender Distribution</div>
                    {byGender.map(([label, count]) => (
                        <BarRow key={label} label={label} count={count} pct={(count / maxGender) * 100} color="#e040fb" />
                    ))}
                </div>
            </div>
            <div className={styles.card}>
                <div className={styles.sectionTitle}>Top Countries by Users</div>
                <div className={styles.splitRow}>
                    {byCountry.map(([code, count]) => (
                        <BarRow key={code} label={code} count={count} pct={(count / maxCountry) * 100} color="#00bcd4" />
                    ))}
                </div>
            </div>
        </div>
    );
}

function AdvertisingTab() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const [campaigns, setCampaigns] = useState<CampaignPerf[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('mv_ad_campaign_performance')
                .select('*')
                .order('total_spend', { ascending: false })
                .limit(50);
            if (error) throw error;
            setCampaigns((data || []).map((r: any) => ({
                id: r.id,
                campaign_title: r.campaign_title,
                total_impressions: r.total_impressions ?? 0,
                total_clicks: r.total_clicks ?? 0,
                ctr: parseFloat(r.ctr ?? '0'),
                total_spend: parseFloat(r.total_spend ?? '0'),
            })));
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalImpressions = campaigns.reduce((a, c) => a + c.total_impressions, 0);
    const totalClicks = campaigns.reduce((a, c) => a + c.total_clicks, 0);
    const totalSpend = campaigns.reduce((a, c) => a + c.total_spend, 0);
    const avgCtr = campaigns.length ? campaigns.reduce((a, c) => a + c.ctr, 0) / campaigns.length : 0;

    const columns: Column<CampaignPerf>[] = [
        { header: 'Campaign', render: (c) => <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.campaign_title}</div> },
        { header: 'Impressions', render: (c) => <div style={{ fontFamily: 'monospace' }}>{c.total_impressions.toLocaleString()}</div> },
        { header: 'Clicks', render: (c) => <div style={{ fontFamily: 'monospace' }}>{c.total_clicks.toLocaleString()}</div> },
        {
            header: 'CTR',
            render: (c) => (
                <div style={{ fontFamily: 'monospace', color: c.ctr >= 3 ? '#4caf50' : c.ctr >= 1 ? '#ff9800' : 'inherit' }}>
                    {c.ctr.toFixed(2)}%
                </div>
            ),
        },
        { header: 'Total Spend', render: (c) => <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>${c.total_spend.toFixed(2)}</div> },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className={sharedStyles.statsGrid}>
                <StatCard label="Total Impressions" value={totalImpressions.toLocaleString()} />
                <StatCard label="Total Clicks" value={totalClicks.toLocaleString()} />
                <StatCard label="Avg CTR" value={`${avgCtr.toFixed(2)}%`} change="Across all campaigns" trend="neutral" />
                <StatCard label="Total Ad Spend" value={`$${totalSpend.toFixed(2)}`} change="USD billed" trend="neutral" />
            </div>
            <DataTable<CampaignPerf>
                data={campaigns}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No campaign performance data yet."
            />
        </div>
    );
}

function SearchTab() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const [queries, setQueries] = useState<SearchQuery[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('search_analytics')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);
            if (error) throw error;
            setQueries((data || []).map((r: any) => ({
                id: r.id,
                query_text: r.query_text,
                results_count: r.results_count,
                created_at: r.created_at,
            })));
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const topQueries = Object.entries(
        queries.reduce<Record<string, { count: number; avgResults: number; sum: number }>>((acc, q) => {
            const key = q.query_text.toLowerCase().trim();
            if (!acc[key]) acc[key] = { count: 0, avgResults: 0, sum: 0 };
            acc[key].count++;
            acc[key].sum += q.results_count;
            acc[key].avgResults = Math.round(acc[key].sum / acc[key].count);
            return acc;
        }, {})
    ).sort((a, b) => b[1].count - a[1].count).slice(0, 15);

    const zeroResultQueries = queries.filter(q => q.results_count === 0);
    const avgResults = queries.length ? (queries.reduce((a, q) => a + q.results_count, 0) / queries.length) : 0;
    const maxCount = Math.max(...topQueries.map(([, v]) => v.count), 1);

    const paginated = queries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(queries.length / itemsPerPage);

    const columns: Column<SearchQuery>[] = [
        { header: 'Query', render: (q) => <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{q.query_text}</span> },
        {
            header: 'Results',
            render: (q) => (
                <Badge
                    label={q.results_count === 0 ? 'No results' : `${q.results_count}`}
                    variant={q.results_count === 0 ? 'error' : 'neutral'}
                />
            ),
        },
        { header: 'Time', render: (q) => <div style={{ fontSize: '12px', opacity: 0.6 }}>{new Date(q.created_at).toLocaleString()}</div> },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className={sharedStyles.statsGrid}>
                <StatCard label="Total Searches (sample)" value={queries.length.toLocaleString()} change="Last 500 events" trend="neutral" />
                <StatCard label="Avg Results" value={avgResults.toFixed(1)} change="Per search" trend="neutral" />
                <StatCard
                    label="Zero-Result Searches"
                    value={zeroResultQueries.length}
                    change={`${queries.length ? ((zeroResultQueries.length / queries.length) * 100).toFixed(1) : 0}% of searches`}
                    trend={zeroResultQueries.length > 0 ? "negative" : "neutral"}
                />
                <StatCard label="Unique Queries" value={topQueries.length} change="In top-500 sample" trend="neutral" />
            </div>

            <div className={styles.splitRow}>
                <div className={styles.card}>
                    <div className={styles.sectionTitle}>Top 15 Searches</div>
                    {topQueries.map(([query, { count, avgResults: avg }]) => (
                        <BarRow
                            key={query}
                            label={query}
                            count={`${count}× · ~${avg} results`}
                            pct={(count / maxCount) * 100}
                            color={avg === 0 ? '#ff4d4d' : 'var(--color-brand-primary)'}
                        />
                    ))}
                </div>
                <div className={styles.card}>
                    <div className={styles.sectionTitle}>Recent Searches</div>
                    <DataTable<SearchQuery>
                        data={paginated}
                        columns={columns}
                        isLoading={isLoading}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        emptyMessage="No search data found."
                    />
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

    const initialTab = (searchParams.get('tab') as any) || 'platform';
    const [activeTab, setActiveTab] = useState<Tab>(
        (['platform', 'demographics', 'advertising', 'search'].includes(initialTab) ? initialTab : 'platform') as Tab
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as Tab;
        if (tab && ['platform', 'demographics', 'advertising', 'search'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as Tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    return (
        <>
            <Tabs
                options={[
                    { id: 'platform', label: 'Platform' },
                    { id: 'demographics', label: 'Demographics' },
                    { id: 'advertising', label: 'Advertising' },
                    { id: 'search', label: 'Search' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            <main className={styles.content}>
                {activeTab === 'platform' && <PlatformTab />}
                {activeTab === 'demographics' && <DemographicsTab />}
                {activeTab === 'advertising' && <AdvertisingTab />}
                {activeTab === 'search' && <SearchTab />}
            </main>
        </>
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
            <header>
                <h1 className={adminStyles.title}>Analytics</h1>
                <p className={adminStyles.subtitle}>Platform-wide metrics powered by materialized views — refreshed automatically.</p>
            </header>

            <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>Loading Analytics...</div>}>
                <AnalyticsContent />
            </Suspense>
        </div>
    );
}
