"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import { Tabs, TabsList, TabsTrigger } from '@/components/shared/Tabs';
import StatCard from '@/components/dashboard/StatCard';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { useCountries } from '@/hooks/useCountries';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useOrganization } from '@/context/OrganizationContext';

type Tab = 'demographics' | 'events' | 'advertising' | 'community' | 'revenue';

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

interface AccountTypeRow {
    account_type: string;
    count: number;
}

interface AccountCreationRow {
    day: string;
    count: number;
}

interface ChurnRiskRow {
    status: 'active' | 'lapsing' | 'inactive';
    count: number;
}

interface DemographicData {
    account_types: AccountTypeRow[];
    account_creation: AccountCreationRow[];
    churn_risk?: ChurnRiskRow[];
}

interface GeoRow {
    country: string;
    account_role: string;
    user_count: number;
}

interface RevenueBreakdownRow {
    reason: string;
    count: number;
    gross_amount: number;
    fee_amount: number;
}

interface ProviderBreakdownRow {
    provider_name: string;
    count: number;
    gross_amount: number;
    fee_amount: number;
}

interface SubscriptionPlanRow {
    plan_id: string;
    count: number;
    gross_amount: number;
}

interface SubscriptionStatusRow {
    status: string;
    count: number;
}

interface RevenueData {
    by_reason: RevenueBreakdownRow[];
    by_provider: ProviderBreakdownRow[];
    subscriptions_by_plan: SubscriptionPlanRow[];
    subscriptions_by_status: SubscriptionStatusRow[];
}

interface EventTimelineRow {
    day: string;
    count: number;
}

interface EventFormats {
    physical: number;
    online: number;
}

interface EventPrivacy {
    public: number;
    private: number;
}

interface EventCategoryRow {
    category: string;
    count: number;
}

interface EventTagRow {
    tag: string;
    count: number;
}

interface EventData {
    timeline: EventTimelineRow[];
    formats: EventFormats;
    privacy: EventPrivacy;
    categories: EventCategoryRow[];
    tags: EventTagRow[];
}

interface AdTimelineRow {
    day: string;
    count: number;
}

interface AdTypeRow {
    ad_type: string;
    count: number;
}

interface AdEngagement {
    total_impressions: number;
    total_clicks: number;
    total_spent: number;
    total_budget: number;
}

interface AdvertisingData {
    timeline: AdTimelineRow[];
    ad_types: AdTypeRow[];
    engagement: AdEngagement;
}

interface ForumLeaderboardRow {
    forum_id: string;
    title: string;
    count: number;
}

interface CommunityData {
    by_members: ForumLeaderboardRow[];
    by_messages: ForumLeaderboardRow[];
    by_media: ForumLeaderboardRow[];
}

// ─── Tab Components ─────────────────────────────────────────────────────────

function DemographicTab({ countryFilter }: { countryFilter: string }) {
    const { data, isLoading } = useSupabaseQuery<DemographicData>(
        ['admin-analytics-demographics', countryFilter],
        async (supabase) => {
            try {
                const { data: res, error } = await supabase.schema('api').rpc('get_admin_analytics', { 
                    p_category: 'demographics',
                    p_params: { country_code: countryFilter }
                });
                if (error) throw error;
                return (res as any as DemographicData | null) || { account_types: [], account_creation: [], churn_risk: [] };
            } catch (err) {
                throw err;
            }
        }
    );

    if (isLoading) return <div className={styles.loading}>Loading Demographics...</div>;

    return (
        <div className={styles.tabContent}>
            <div className={styles.statsGrid}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Account Type Distribution</h3>
                    {(() => {
                        const types = data?.account_types || [];
                        const maxVal = Math.max(...types.map(t => t.count), 1);
                        return types.map((r, i) => (
                            <BarRow 
                                key={`${r.account_type}-${i}`} 
                                label={r.account_type.toUpperCase()} 
                                count={r.count} 
                                pct={(r.count / maxVal) * 100} 
                            />
                        ));
                    })()}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Account Creation Trend (Last 30 Days)</h3>
                    {(() => {
                        const trend = data?.account_creation || [];
                        const maxVal = Math.max(...trend.map(t => t.count), 1);
                        return trend.map((r, i) => (
                            <BarRow 
                                key={`${r.day}-${i}`} 
                                label={new Date(r.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
                                count={r.count} 
                                pct={(r.count / maxVal) * 100} 
                                color="#6c63ff"
                            />
                        ));
                    })()}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>User Engagement</h3>
                    {(() => {
                        const churnData = data?.churn_risk || [];
                        const total = churnData.reduce((acc, c) => acc + c.count, 0) || 1;
                        
                        const statusConfig: Record<string, { label: string; color: string }> = {
                            active: { label: 'Active (Last 7d)', color: 'var(--color-brand-primary)' },
                            lapsing: { label: 'Lapsing (8-30d)', color: '#f59e0b' },
                            inactive: { label: 'Inactive (>30d)', color: '#ef4444' }
                        };
                        
                        const statuses = ['active', 'lapsing', 'inactive'];
                        
                        return statuses.map((status) => {
                            const found = churnData.find(c => c.status === status);
                            const count = found ? found.count : 0;
                            const pct = Math.round((count / total) * 100);
                            const config = statusConfig[status];
                            
                            return (
                                <BarRow 
                                    key={status} 
                                    label={config.label} 
                                    count={count} 
                                    pct={pct} 
                                    color={config.color}
                                />
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
    );
}



function RevenueTab({ countryFilter }: { countryFilter: string }) {
    const { data, isLoading } = useSupabaseQuery<RevenueData>(
        ['admin-analytics-revenue', countryFilter],
        async (supabase) => {
            try {
                const { data: res, error } = await supabase.schema('api').rpc('get_admin_analytics', { 
                    p_category: 'revenue',
                    p_params: { country_code: countryFilter }
                });
                if (error) throw error;
                return (res as any as RevenueData | null) || { 
                    by_reason: [], 
                    by_provider: [], 
                    subscriptions_by_plan: [], 
                    subscriptions_by_status: [] 
                };
            } catch (err) {
                throw err;
            }
        }
    );

    if (isLoading) return <div className={styles.loading}>Loading Revenue...</div>;

    const byReason = data?.by_reason || [];
    const byProvider = data?.by_provider || [];
    const subscriptionsByPlan = data?.subscriptions_by_plan || [];
    const subscriptionsByStatus = data?.subscriptions_by_status || [];

    const totalGross = byReason.reduce((acc, r) => acc + Number(r.gross_amount), 0);
    const totalFees = byReason.reduce((acc, r) => acc + Number(r.fee_amount), 0);
    const totalTxCount = byReason.reduce((acc, r) => acc + r.count, 0);
    const activeSubs = subscriptionsByPlan.reduce((acc, s) => acc + s.count, 0);

    const maxReasonVolume = Math.max(...byReason.map(r => Number(r.gross_amount)), 1);
    const maxProviderVolume = Math.max(...byProvider.map(p => Number(p.gross_amount)), 1);
    const maxSubPlanVolume = Math.max(...subscriptionsByPlan.map(s => Number(s.gross_amount)), 1);
    const maxSubStatusCount = Math.max(...subscriptionsByStatus.map(s => s.count), 1);

    const formatLabel = (val: string) => {
        return val.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className={styles.tabContent}>
            <div className={styles.statsGrid}>
                <StatCard 
                    label="Gross Transaction Volume" 
                    value={`$${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    change="Platform Gross" 
                    trend="positive" 
                />
                <StatCard 
                    label="Net Platform Revenue" 
                    value={`$${totalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    change="Fees Collected" 
                    trend="positive" 
                />
                <StatCard 
                    label="Total Payments" 
                    value={totalTxCount.toLocaleString()} 
                    change="Successful Transactions" 
                    trend="neutral" 
                />
                <StatCard 
                    label="Active Subscriptions" 
                    value={activeSubs.toLocaleString()} 
                    change="Premium accounts" 
                    trend="positive" 
                />
            </div>

            <div className={styles.splitRow} style={{ marginTop: '24px' }}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Transactions by Reason</h3>
                    {byReason.map((r, i) => (
                        <BarRow 
                            key={`${r.reason}-${i}`} 
                            label={formatLabel(r.reason)} 
                            count={`$${Number(r.gross_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })} (${r.count})`} 
                            pct={(Number(r.gross_amount) / maxReasonVolume) * 100} 
                            color="var(--color-brand-primary)"
                        />
                    ))}
                    {byReason.length === 0 && <div className={styles.loading}>No transaction reason data available</div>}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Transactions by Payment Provider</h3>
                    {byProvider.map((p, i) => (
                        <BarRow 
                            key={`${p.provider_name}-${i}`} 
                            label={p.provider_name} 
                            count={`$${Number(p.gross_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })} (${p.count})`} 
                            pct={(Number(p.gross_amount) / maxProviderVolume) * 100} 
                            color="#10b981"
                        />
                    ))}
                    {byProvider.length === 0 && <div className={styles.loading}>No payment provider data available</div>}
                </div>
            </div>

            <div className={styles.splitRow} style={{ marginTop: '24px' }}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Subscriptions by Plan</h3>
                    {subscriptionsByPlan.map((s, i) => (
                        <BarRow 
                            key={`${s.plan_id}-${i}`} 
                            label={formatLabel(s.plan_id)} 
                            count={`$${Number(s.gross_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })} (${s.count})`} 
                            pct={(Number(s.gross_amount) / maxSubPlanVolume) * 100} 
                            color="#3b82f6"
                        />
                    ))}
                    {subscriptionsByPlan.length === 0 && <div className={styles.loading}>No subscription plan data available</div>}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Subscription Status Distribution</h3>
                    {subscriptionsByStatus.map((s, i) => (
                        <BarRow 
                            key={`${s.status}-${i}`} 
                            label={formatLabel(s.status)} 
                            count={s.count} 
                            pct={(s.count / maxSubStatusCount) * 100} 
                            color="#a855f7"
                        />
                    ))}
                    {subscriptionsByStatus.length === 0 && <div className={styles.loading}>No subscription status data available</div>}
                </div>
            </div>
        </div>
    );
}

function EventTab({ countryFilter }: { countryFilter: string }) {
    const { data, isLoading } = useSupabaseQuery<EventData>(
        ['admin-analytics-events', countryFilter],
        async (supabase) => {
            try {
                const { data: res, error } = await supabase.schema('api').rpc('get_admin_analytics', { 
                    p_category: 'events',
                    p_params: { country_code: countryFilter }
                });
                if (error) throw error;
                return (res as any as EventData | null) || { 
                    timeline: [], 
                    formats: { physical: 0, online: 0 }, 
                    privacy: { public: 0, private: 0 }, 
                    categories: [], 
                    tags: [] 
                };
            } catch (err) {
                throw err;
            }
        }
    );

    if (isLoading) return <div className={styles.loading}>Loading Events...</div>;

    const timeline = data?.timeline || [];
    const formats = data?.formats || { physical: 0, online: 0 };
    const privacy = data?.privacy || { public: 0, private: 0 };
    const categories = data?.categories || [];
    const tags = data?.tags || [];

    const totalFormats = formats.physical + formats.online || 1;
    const physicalPct = Math.round((formats.physical / totalFormats) * 100);
    const onlinePct = Math.round((formats.online / totalFormats) * 100);

    const totalPrivacy = privacy.public + privacy.private || 1;
    const publicPct = Math.round((privacy.public / totalPrivacy) * 100);
    const privatePct = Math.round((privacy.private / totalPrivacy) * 100);

    const maxTimeline = Math.max(...timeline.map(t => t.count), 1);
    const maxCategory = Math.max(...categories.map(c => c.count), 1);
    const maxTag = Math.max(...tags.map(t => t.count), 1);

    return (
        <div className={styles.tabContent}>
            <div className={styles.splitRow}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Event Formats</h3>
                    <BarRow label="Physical" count={formats.physical} pct={physicalPct} color="var(--color-brand-primary)" />
                    <BarRow label="Online / Virtual" count={formats.online} pct={onlinePct} color="#3b82f6" />
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Event Privacy</h3>
                    <BarRow label="Public" count={privacy.public} pct={publicPct} color="#10b981" />
                    <BarRow label="Private / Invite-Only" count={privacy.private} pct={privatePct} color="#f59e0b" />
                </div>
            </div>

            <div className={styles.splitRow} style={{ marginTop: '24px' }}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Top Event Categories</h3>
                    {categories.slice(0, 5).map((c, i) => (
                        <BarRow 
                            key={`${c.category}-${i}`} 
                            label={c.category} 
                            count={c.count} 
                            pct={(c.count / maxCategory) * 100} 
                        />
                    ))}
                    {categories.length === 0 && <div className={styles.loading}>No category data available</div>}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Trending Event Tags</h3>
                    {tags.slice(0, 5).map((t, i) => (
                        <BarRow 
                            key={`${t.tag}-${i}`} 
                            label={`#${t.tag}`} 
                            count={t.count} 
                            pct={(t.count / maxTag) * 100} 
                            color="#a855f7"
                        />
                    ))}
                    {tags.length === 0 && <div className={styles.loading}>No tag data available</div>}
                </div>
            </div>

            <div className={styles.card} style={{ marginTop: '24px' }}>
                <h3 className={styles.cardTitle}>Event Creation Velocity (Last 30 Days)</h3>
                {timeline.map((t, i) => (
                    <BarRow 
                        key={`${t.day}-${i}`} 
                        label={new Date(t.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
                        count={t.count} 
                        pct={(t.count / maxTimeline) * 100} 
                        color="#6c63ff"
                    />
                ))}
                {timeline.length === 0 && <div className={styles.loading}>No timeline data available</div>}
            </div>
        </div>
    );
}

function AdvertisingTab({ countryFilter }: { countryFilter: string }) {
    const { data, isLoading } = useSupabaseQuery<AdvertisingData>(
        ['admin-analytics-advertising', countryFilter],
        async (supabase) => {
            try {
                const { data: res, error } = await supabase.schema('api').rpc('get_admin_analytics', { 
                    p_category: 'advertising',
                    p_params: { country_code: countryFilter }
                });
                if (error) throw error;
                return (res as any as AdvertisingData | null) || { 
                    timeline: [], 
                    ad_types: [], 
                    engagement: { total_impressions: 0, total_clicks: 0, total_spent: 0, total_budget: 0 } 
                };
            } catch (err) {
                throw err;
            }
        }
    );

    if (isLoading) return <div className={styles.loading}>Loading Advertising...</div>;

    const timeline = data?.timeline || [];
    const adTypes = data?.ad_types || [];
    const engagement = data?.engagement || { total_impressions: 0, total_clicks: 0, total_spent: 0, total_budget: 0 };

    const ctr = engagement.total_impressions > 0 
        ? (engagement.total_clicks / engagement.total_impressions) * 100 
        : 0;

    const maxTimeline = Math.max(...timeline.map(t => t.count), 1);
    const maxAdType = Math.max(...adTypes.map(t => t.count), 1);

    return (
        <div className={styles.tabContent}>
            <div className={styles.statsGrid}>
                <StatCard label="Total Impressions" value={engagement.total_impressions.toLocaleString()} change="Across all campaigns" trend="neutral" />
                <StatCard label="Total Clicks" value={engagement.total_clicks.toLocaleString()} change="Across all campaigns" trend="neutral" />
                <StatCard label="Average CTR" value={`${ctr.toFixed(3)}%`} change="Click-Through Rate" trend="positive" />
                <StatCard label="Ad Spend" value={`KES ${engagement.total_spent.toLocaleString()}`} change={`of KES ${engagement.total_budget.toLocaleString()} budget`} trend="neutral" />
            </div>

            <div className={styles.splitRow} style={{ marginTop: '24px' }}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Ad Type Distribution</h3>
                    {adTypes.map((t, i) => (
                        <BarRow 
                            key={`${t.ad_type}-${i}`} 
                            label={t.ad_type.toUpperCase()} 
                            count={t.count} 
                            pct={(t.count / maxAdType) * 100} 
                        />
                    ))}
                    {adTypes.length === 0 && <div className={styles.loading}>No ad type data available</div>}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Active Campaign Creation Timeline</h3>
                    {timeline.map((t, i) => (
                        <BarRow 
                            key={`${t.day}-${i}`} 
                            label={new Date(t.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
                            count={t.count} 
                            pct={(t.count / maxTimeline) * 100} 
                            color="#10b981"
                        />
                    ))}
                    {timeline.length === 0 && <div className={styles.loading}>No timeline data available</div>}
                </div>
            </div>
        </div>
    );
}

function CommunityTab({ countryFilter }: { countryFilter: string }) {
    const { data, isLoading } = useSupabaseQuery<CommunityData>(
        ['admin-analytics-community', countryFilter],
        async (supabase) => {
            try {
                const { data: res, error } = await supabase.schema('api').rpc('get_admin_analytics', { 
                    p_category: 'community',
                    p_params: { country_code: countryFilter }
                });
                if (error) throw error;
                return (res as any as CommunityData | null) || { 
                    by_members: [], 
                    by_messages: [], 
                    by_media: [] 
                };
            } catch (err) {
                throw err;
            }
        }
    );

    if (isLoading) return <div className={styles.loading}>Loading Community...</div>;

    const byMembers = data?.by_members || [];
    const byMessages = data?.by_messages || [];
    const byMedia = data?.by_media || [];

    const maxMembers = Math.max(...byMembers.map(f => f.count), 1);
    const maxMessages = Math.max(...byMessages.map(f => f.count), 1);
    const maxMedia = Math.max(...byMedia.map(f => f.count), 1);

    return (
        <div className={styles.tabContent}>
            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Top Forums by Member Count</h3>
                {byMembers.map((f, i) => (
                    <BarRow 
                        key={`${f.forum_id}-${i}`} 
                        label={f.title} 
                        count={f.count} 
                        pct={(f.count / maxMembers) * 100} 
                        color="var(--color-brand-primary)"
                    />
                ))}
                {byMembers.length === 0 && <div className={styles.loading}>No forum member data available</div>}
            </div>

            <div className={styles.splitRow} style={{ marginTop: '24px' }}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Top Forums by Message Volume</h3>
                    {byMessages.map((f, i) => (
                        <BarRow 
                            key={`${f.forum_id}-${i}`} 
                            label={f.title} 
                            count={f.count} 
                            pct={(f.count / maxMessages) * 100} 
                            color="#10b981"
                        />
                    ))}
                    {byMessages.length === 0 && <div className={styles.loading}>No message volume data available</div>}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Top Forums by Shared Media</h3>
                    {byMedia.map((f, i) => (
                        <BarRow 
                            key={`${f.forum_id}-${i}`} 
                            label={f.title} 
                            count={f.count} 
                            pct={(f.count / maxMedia) * 100} 
                            color="#a855f7"
                        />
                    ))}
                    {byMedia.length === 0 && <div className={styles.loading}>No shared media data available</div>}
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

    const { activeAccount } = useOrganization();

    const initialTab = (searchParams.get('tab') as string) || 'demographics';
    const [activeTab, setActiveTab] = useState<Tab>(
        (['demographics', 'events', 'advertising', 'community', 'revenue'].includes(initialTab) ? initialTab as Tab : 'demographics')
    );

    // Lock local territory analytics to the active administrator's country_code
    const activeCountry = activeAccount?.country_code || 'KE';
    const [countryFilter] = useState(activeCountry.toLowerCase());

    useEffect(() => {
        const tab = searchParams.get('tab') as Tab;
        if (tab && ['demographics', 'events', 'advertising', 'community', 'revenue'].includes(tab)) {
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <div className={sharedStyles.tabsHeaderRow} style={{ marginBottom: 0, borderBottom: 'none' }}>
                        <TabsList>
                            <TabsTrigger value="demographics">Demographics</TabsTrigger>
                            <TabsTrigger value="events">Events</TabsTrigger>
                            <TabsTrigger value="advertising">Advertising</TabsTrigger>
                            <TabsTrigger value="community">Community</TabsTrigger>
                            <TabsTrigger value="revenue">Revenue</TabsTrigger>
                        </TabsList>
                    </div>
                </Tabs>
            </div>

            {activeTab === 'demographics' && <DemographicTab countryFilter={countryFilter} />}
            {activeTab === 'events' && <EventTab countryFilter={countryFilter} />}
            {activeTab === 'advertising' && <AdvertisingTab countryFilter={countryFilter} />}
            {activeTab === 'community' && <CommunityTab countryFilter={countryFilter} />}
            {activeTab === 'revenue' && <RevenueTab countryFilter={countryFilter} />}
        </div>
    );
}

/**
 * Admin-only analytics hub.
 * Reads from materialized views (mv_platform_overview, mv_platform_financial_ledger,
 * mv_ad_campaign_performance, mv_platform_demographics, mv_tag_leaderboard)
 * and the live search_analytics table.
 *
 * Scoped to active administrator's territory with resilient database fallbacks.
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
