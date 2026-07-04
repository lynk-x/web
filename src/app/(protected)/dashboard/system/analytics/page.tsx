"use client";

/**
 * Global System Analytics page — super_admin only.
 * Reads insights.mv_insights, mv_demographics(_geo), and mv_ad_performance
 * via api.get_system_analytics, distinct from the country-scoped
 * /dashboard/admin/analytics page (api.get_admin_analytics).
 */

import { useState, useEffect, Suspense, type CSSProperties } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/shared/Tabs';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import EmptyState from '@/components/shared/EmptyState';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import {
    AreaChart, Area,
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

type Tab = 'search' | 'demographics' | 'events' | 'forums' | 'advertising';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface SearchQueryRow {
    search_query: string;
    attempt_count: number;
    zero_result_count?: number;
    zero_result_rate_pct?: number;
    last_attempt_at: string;
}

interface SearchData {
    top_queries: SearchQueryRow[];
    zero_result_queries: SearchQueryRow[];
}

interface GeoDemographicRow {
    country: string;
    account_role: string;
    user_count: number;
}

interface AgeGenderRow {
    country: string;
    gender: string | null;
    account_role: string;
    age_bucket: string;
    user_count: number;
}

interface DemographicsData {
    by_geo: GeoDemographicRow[];
    by_age_gender: AgeGenderRow[];
}

interface EventPerformanceRow {
    id: string;
    event_title: string;
    account_name: string;
    status: string;
    starts_at?: string;
    attendee_count: number;
    revenue: number | null;
    reports_count: number;
}

interface EventsData {
    top_events: EventPerformanceRow[];
    flagged_events: EventPerformanceRow[];
}

interface ActiveForumRow {
    id: string;
    event_title: string;
    status: string;
    last_activity_at: string | null;
    activity_count: number;
    announcements_count: number;
    live_chats_count: number;
    channels_count: number;
    media_count: number;
    member_count: number;
    active_members_24h: number;
}

interface FlaggedForumRow {
    id: string;
    event_title: string;
    status: string;
    member_count: number;
    reports_count: number;
    escalated_reports_count: number;
    oldest_report_at: string | null;
}

interface ForumsData {
    most_active: ActiveForumRow[];
    flagged_forums: FlaggedForumRow[];
}

interface AdDailyRow {
    day: string;
    campaign_type: string;
    country: string;
    impression_count: number;
    click_count: number;
    total_spend: number;
    ctr_pct: number;
}

interface AdCampaignRow {
    campaign_id: string;
    impression_count: number;
    click_count: number;
    total_spend: number;
    ctr_pct: number;
}

interface AdvertisingData {
    daily_series: AdDailyRow[];
    top_campaigns: AdCampaignRow[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CHART_COLORS = {
    primary: 'var(--color-brand-primary, #6c63ff)',
    blue: '#3b82f6',
    orange: '#f59e0b',
};

// Matches DataTable's .tableContainer so charts and tables share one
// surface/border/radius across the page instead of charts floating bare.
const CHART_CONTAINER_STYLE: CSSProperties = {
    backgroundColor: 'var(--color-interface-surface)',
    border: '1px solid var(--color-interface-outline)',
    borderRadius: 'var(--radius-xl)',
    padding: '20px 16px 12px'
};

const TOOLTIP_STYLE = {
    contentStyle: {
        backgroundColor: 'rgba(19, 19, 26, 0.95)',
        borderColor: 'var(--color-interface-outline, rgba(255,255,255,0.08))',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '13px',
        backdropFilter: 'blur(8px)'
    },
    itemStyle: { color: '#fff' },
    labelStyle: { color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' as const }
};

// ─── Tab Components ─────────────────────────────────────────────────────────

function SearchTab() {
    const { data, isLoading } = useSupabaseQuery<SearchData>(
        ['system-analytics-search'],
        async (supabase) => {
            const { data: res, error } = await supabase.schema('api').rpc('get_system_analytics', {
                p_category: 'search'
            });
            if (error) throw error;
            return (res as any as SearchData | null) || { top_queries: [], zero_result_queries: [] };
        }
    );

    const topColumns: Column<SearchQueryRow>[] = [
        { header: 'Query', render: (r) => <div style={{ fontWeight: 600 }}>{r.search_query}</div> },
        { header: 'Attempts (90d)', render: (r) => r.attempt_count },
        { header: 'Zero-Result Rate', render: (r) => <Badge label={`${r.zero_result_rate_pct ?? 0}%`} variant={(r.zero_result_rate_pct ?? 0) > 50 ? 'error' : 'neutral'} /> },
        { header: 'Last Seen', render: (r) => new Date(r.last_attempt_at).toLocaleDateString() }
    ];

    const gapColumns: Column<SearchQueryRow>[] = [
        { header: 'Query', render: (r) => <div style={{ fontWeight: 600 }}>{r.search_query}</div> },
        { header: 'Attempts (90d)', render: (r) => r.attempt_count },
        { header: 'Last Seen', render: (r) => new Date(r.last_attempt_at).toLocaleDateString() }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>Top Search Queries (90 days)</h3>
                <DataTable data={(data?.top_queries ?? []).map(r => ({ ...r, id: r.search_query }))} columns={topColumns} isLoading={isLoading} emptyMessage="No search activity in the last 90 days." />
            </div>
            <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>Search Gaps (queries returning zero results)</h3>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', opacity: 0.6 }}>
                    Recurring zero-result queries indicate missing content, tags, or events worth adding.
                </p>
                <DataTable data={(data?.zero_result_queries ?? []).map(r => ({ ...r, id: r.search_query }))} columns={gapColumns} isLoading={isLoading} emptyMessage="No zero-result search gaps in the last 90 days." />
            </div>
        </div>
    );
}

function DemographicsTab() {
    const { data, isLoading } = useSupabaseQuery<DemographicsData>(
        ['system-analytics-demographics'],
        async (supabase) => {
            const { data: res, error } = await supabase.schema('api').rpc('get_system_analytics', {
                p_category: 'demographics'
            });
            if (error) throw error;
            return (res as any as DemographicsData | null) || { by_geo: [], by_age_gender: [] };
        }
    );

    const geoChartData = (data?.by_geo ?? []).reduce((acc: { country: string; count: number }[], row) => {
        const existing = acc.find(a => a.country === row.country);
        if (existing) existing.count += row.user_count;
        else acc.push({ country: row.country, count: row.user_count });
        return acc;
    }, []).sort((a, b) => b.count - a.count).slice(0, 15);

    const ageColumns: Column<AgeGenderRow>[] = [
        { header: 'Country', render: (r) => r.country },
        { header: 'Gender', render: (r) => r.gender || 'Unspecified' },
        { header: 'Role', render: (r) => <Badge label={r.account_role} variant="neutral" /> },
        { header: 'Age Bucket', render: (r) => r.age_bucket },
        { header: 'Users', render: (r) => r.user_count }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>Users by Country</h3>
                <div style={CHART_CONTAINER_STYLE}>
                    {isLoading ? (
                        <EmptyState message="Loading..." height={320} />
                    ) : geoChartData.length === 0 ? (
                        <EmptyState message="No demographic data available." height={320} />
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={geoChartData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                                <YAxis type="category" dataKey="country" stroke="rgba(255,255,255,0.4)" fontSize={12} width={60} />
                                <Tooltip {...TOOLTIP_STYLE} />
                                <Bar dataKey="count" name="Users" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
            <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>Age &amp; Gender Breakdown</h3>
                <DataTable data={(data?.by_age_gender ?? []).map((r, i) => ({ ...r, id: `${r.country}-${r.gender}-${r.account_role}-${r.age_bucket}-${i}` }))} columns={ageColumns} isLoading={isLoading} emptyMessage="No age/gender data available." />
            </div>
        </div>
    );
}

function EventsTab() {
    const { data, isLoading } = useSupabaseQuery<EventsData>(
        ['system-analytics-events'],
        async (supabase) => {
            const { data: res, error } = await supabase.schema('api').rpc('get_system_analytics', {
                p_category: 'events'
            });
            if (error) throw error;
            return (res as any as EventsData | null) || { top_events: [], flagged_events: [] };
        }
    );

    const topColumns: Column<EventPerformanceRow>[] = [
        { header: 'Event', render: (r) => <div style={{ fontWeight: 600 }}>{r.event_title}</div> },
        { header: 'Organizer', render: (r) => r.account_name },
        { header: 'Status', render: (r) => <Badge label={r.status} variant={r.status === 'published' ? 'success' : 'neutral'} /> },
        { header: 'Attendees', render: (r) => r.attendee_count.toLocaleString() },
        { header: 'Revenue', render: (r) => r.revenue != null ? `$${Number(r.revenue).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—' }
    ];

    const flaggedColumns: Column<EventPerformanceRow>[] = [
        { header: 'Event', render: (r) => <div style={{ fontWeight: 600 }}>{r.event_title}</div> },
        { header: 'Organizer', render: (r) => r.account_name },
        { header: 'Status', render: (r) => <Badge label={r.status} variant="neutral" /> },
        { header: 'Pending Reports', render: (r) => <Badge label={String(r.reports_count)} variant="error" /> }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>Top Events by Attendance</h3>
                <DataTable data={(data?.top_events ?? []).map(r => ({ ...r, id: r.id }))} columns={topColumns} isLoading={isLoading} emptyMessage="No event performance data available." />
            </div>
            <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>Flagged Events (pending reports)</h3>
                <DataTable data={(data?.flagged_events ?? []).map(r => ({ ...r, id: r.id }))} columns={flaggedColumns} isLoading={isLoading} emptyMessage="No flagged events." />
            </div>
        </div>
    );
}

function ForumsTab() {
    const { data, isLoading } = useSupabaseQuery<ForumsData>(
        ['system-analytics-forums'],
        async (supabase) => {
            const { data: res, error } = await supabase.schema('api').rpc('get_system_analytics', {
                p_category: 'forums'
            });
            if (error) throw error;
            return (res as any as ForumsData | null) || { most_active: [], flagged_forums: [] };
        }
    );

    const activeColumns: Column<ActiveForumRow>[] = [
        { header: 'Event', render: (r) => <div style={{ fontWeight: 600 }}>{r.event_title}</div> },
        { header: 'Status', render: (r) => <Badge label={r.status} variant={r.status === 'active' ? 'success' : 'neutral'} /> },
        { header: 'Messages', render: (r) => (r.announcements_count + r.live_chats_count).toLocaleString() },
        { header: 'Members', render: (r) => r.member_count.toLocaleString() },
        { header: 'Active (24h)', render: (r) => r.active_members_24h.toLocaleString() },
        { header: 'Last Activity', render: (r) => r.last_activity_at ? new Date(r.last_activity_at).toLocaleDateString() : '—' }
    ];

    const flaggedColumns: Column<FlaggedForumRow>[] = [
        { header: 'Event', render: (r) => <div style={{ fontWeight: 600 }}>{r.event_title}</div> },
        { header: 'Status', render: (r) => <Badge label={r.status} variant="neutral" /> },
        { header: 'Members', render: (r) => r.member_count.toLocaleString() },
        { header: 'Reports', render: (r) => <Badge label={String(r.reports_count)} variant={r.escalated_reports_count > 0 ? 'error' : 'warning'} /> },
        { header: 'Escalated', render: (r) => r.escalated_reports_count },
        { header: 'Oldest Pending', render: (r) => r.oldest_report_at ? new Date(r.oldest_report_at).toLocaleDateString() : '—' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>Most Active Forums</h3>
                <DataTable data={(data?.most_active ?? []).map(r => ({ ...r, id: r.id }))} columns={activeColumns} isLoading={isLoading} emptyMessage="No forum activity data available." />
            </div>
            <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>Flagged Forums (pending reports)</h3>
                <DataTable data={(data?.flagged_forums ?? []).map(r => ({ ...r, id: r.id }))} columns={flaggedColumns} isLoading={isLoading} emptyMessage="No flagged forums." />
            </div>
        </div>
    );
}

function AdvertisingTab() {
    const { data, isLoading } = useSupabaseQuery<AdvertisingData>(
        ['system-analytics-advertising'],
        async (supabase) => {
            const { data: res, error } = await supabase.schema('api').rpc('get_system_analytics', {
                p_category: 'advertising'
            });
            if (error) throw error;
            return (res as any as AdvertisingData | null) || { daily_series: [], top_campaigns: [] };
        }
    );

    const trendData = (data?.daily_series ?? []).reduce((acc: { day: string; impressions: number; clicks: number; spend: number }[], row) => {
        const existing = acc.find(a => a.day === row.day);
        if (existing) {
            existing.impressions += row.impression_count;
            existing.clicks += row.click_count;
            existing.spend += row.total_spend;
        } else {
            acc.push({ day: row.day, impressions: row.impression_count, clicks: row.click_count, spend: row.total_spend });
        }
        return acc;
    }, []).sort((a, b) => a.day.localeCompare(b.day));

    const campaignColumns: Column<AdCampaignRow>[] = [
        { header: 'Campaign', render: (r) => <code style={{ fontSize: '12px' }}>{r.campaign_id.slice(0, 8)}</code> },
        { header: 'Impressions', render: (r) => r.impression_count.toLocaleString() },
        { header: 'Clicks', render: (r) => r.click_count.toLocaleString() },
        { header: 'CTR', render: (r) => <Badge label={`${r.ctr_pct?.toFixed(2) ?? 0}%`} variant="info" /> },
        { header: 'Spend', render: (r) => `$${Number(r.total_spend).toLocaleString(undefined, { maximumFractionDigits: 2 })}` }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>Impressions &amp; Clicks (90 days)</h3>
                <div style={CHART_CONTAINER_STYLE}>
                    {isLoading ? (
                        <EmptyState message="Loading..." height={280} />
                    ) : trendData.length === 0 ? (
                        <EmptyState message="No ad activity in the last 90 days." height={280} />
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
                                <Tooltip {...TOOLTIP_STYLE} />
                                <Area type="monotone" dataKey="impressions" name="Impressions" stroke={CHART_COLORS.primary} fillOpacity={1} fill="url(#colorImpressions)" />
                                <Area type="monotone" dataKey="clicks" name="Clicks" stroke={CHART_COLORS.orange} fillOpacity={0} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
            <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>Top Campaigns by Spend</h3>
                <DataTable data={(data?.top_campaigns ?? []).map(r => ({ ...r, id: r.campaign_id }))} columns={campaignColumns} isLoading={isLoading} emptyMessage="No campaign activity found." />
            </div>
        </div>
    );
}

// ─── Page Shell ─────────────────────────────────────────────────────────────

const VALID_TABS: Tab[] = ['search', 'demographics', 'events', 'forums', 'advertising'];

function AnalyticsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialTab = (searchParams.get('tab') as string) || 'search';
    const [activeTab, setActiveTab] = useState<Tab>(
        VALID_TABS.includes(initialTab as Tab) ? (initialTab as Tab) : 'search'
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as Tab;
        if (tab && VALID_TABS.includes(tab)) {
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className={sharedStyles.tabsHeaderRow} style={{ marginBottom: 0, borderBottom: 'none' }}>
                    <TabsList>
                        <TabsTrigger value="search">Search Insights</TabsTrigger>
                        <TabsTrigger value="demographics">Demographics</TabsTrigger>
                        <TabsTrigger value="events">Events</TabsTrigger>
                        <TabsTrigger value="forums">Forums</TabsTrigger>
                        <TabsTrigger value="advertising">Advertising</TabsTrigger>
                    </TabsList>
                </div>
            </Tabs>

            {activeTab === 'search' && <SearchTab />}
            {activeTab === 'demographics' && <DemographicsTab />}
            {activeTab === 'events' && <EventsTab />}
            {activeTab === 'forums' && <ForumsTab />}
            {activeTab === 'advertising' && <AdvertisingTab />}
        </div>
    );
}

/**
 * Global analytics hub — super_admin only (identity.is_super_admin()).
 * Reads insights.mv_insights, mv_demographics(_geo), mv_ad_performance and
 * mv_ad_campaign_performance via api.get_system_analytics. Distinct from
 * /dashboard/admin/analytics, which is country-scoped for platform admins.
 */
export default function SystemAnalyticsPage() {
    return (
        <div className={styles.container}>
            <PageHeader
                title="System Analytics"
                subtitle="Global platform metrics — search behavior, demographics, and ad performance across all countries."
            />

            <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>Loading Analytics...</div>}>
                <AnalyticsContent />
            </Suspense>
        </div>
    );
}
