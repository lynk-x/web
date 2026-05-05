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

type Tab = 'search' | 'demographics' | 'advertising' | 'platform';


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
    const [ledger, setLedger] = useState<LedgerDay[]>([]);
    const [tags, setTags] = useState<TagRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_analytics', { p_category: 'platform' });
            if (error) throw error;

            const ledgerData = data.ledger || [];
            const tagsData = data.tags || [];

            setLedger(ledgerData.map((r: any) => ({
                id: r.id,
                total_volume: parseFloat(r.total_volume || '0'),
                platform_fee_collected: parseFloat(r.platform_fee_collected || '0'),
                tax_collected: parseFloat(r.tax_collected || '0'),
                payouts_processed: parseFloat(r.payouts_processed || '0'),
            })));
            setTags(tagsData.map((r: any) => ({
                id: r.id,
                name: r.name,
                use_count: r.use_count,
                recent_event_count: r.recent_event_count,
            })));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load platform data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalVolume = ledger.reduce((acc, d) => acc + d.total_volume, 0);
    const totalFees = ledger.reduce((acc, d) => acc + d.platform_fee_collected, 0);
    const maxFee = Math.max(...ledger.map(d => d.platform_fee_collected), 1);
    const maxTag = Math.max(...tags.map(t => t.use_count), 1);

    // Removed top-level early return so cards can show '...' loading state
    // if (isLoading) return <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>Loading platform data…</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
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
            const { data, error } = await supabase.rpc('get_admin_analytics', { p_category: 'demographics' });
            if (error) throw error;
            setRows(data || []);
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
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
            const { data, error } = await supabase.rpc('get_admin_analytics', { p_category: 'advertising' });
            if (error) throw error;
            setCampaigns((data || []).map((r: any) => ({
                id: r.id,
                campaign_title: r.campaign_title,
                total_impressions: r.total_impressions ?? 0,
                total_clicks: r.total_clicks ?? 0,
                ctr: parseFloat(r.ctr ?? '0'),
                total_spend: parseFloat(r.total_spend ?? '0'),
            })));
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);


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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
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
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            <div className={sharedStyles.statsGrid}>
                <StatCard label="Total Searches (sample)" value={queries.length.toLocaleString()} change="Last 500 events" trend="neutral" isLoading={isLoading} />
                <StatCard label="Avg Results" value={avgResults.toFixed(1)} change="Per search" trend="neutral" isLoading={isLoading} />
                <StatCard
                    label="Zero-Result Searches"
                    value={zeroResultQueries.length}
                    change={`${queries.length ? ((zeroResultQueries.length / queries.length) * 100).toFixed(1) : 0}% of searches`}
                    trend={zeroResultQueries.length > 0 ? "negative" : "neutral"}
                    isLoading={isLoading}
                />
                <StatCard label="Unique Queries" value={topQueries.length} change="In top-500 sample" trend="neutral" isLoading={isLoading} />
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

    const initialTab = (searchParams.get('tab') as string) || 'search';
    const [activeTab, setActiveTab] = useState<Tab>(
        (['search', 'demographics', 'advertising', 'platform'].includes(initialTab) ? initialTab as Tab : 'search')
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as Tab;
        if (tab && ['search', 'demographics', 'advertising', 'platform'].includes(tab)) {
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
                    { id: 'search', label: 'Search' },
                    { id: 'demographics', label: 'Demographics' },
                    { id: 'advertising', label: 'Advertising' },
                    { id: 'platform', label: 'Platform' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {activeTab === 'search' && <SearchTab />}
            {activeTab === 'demographics' && <DemographicsTab />}
            {activeTab === 'advertising' && <AdvertisingTab />}
            {activeTab === 'platform' && <PlatformTab />}
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
