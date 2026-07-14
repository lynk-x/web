"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import { Tabs, TabsList, TabsTrigger } from '@/components/shared/Tabs';
import StatCard from '@/components/dashboard/StatCard';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useOrganization } from '@/context/OrganizationContext';
import SharedEmptyState from '@/components/shared/EmptyState';
import { 
    AreaChart, Area, 
    BarChart, Bar, 
    PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

type Tab = 'demographics' | 'events' | 'advertising' | 'community' | 'finance';

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

interface RevenueData {
    by_reason: RevenueBreakdownRow[];
    by_provider: ProviderBreakdownRow[];
    subscriptions_by_plan: SubscriptionPlanRow[];
}

interface EventTimelineRow {
    day: string;
    count: number;
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

interface AdTagRow {
    tag: string;
    count: number;
}

interface AdvertisingData {
    timeline: AdTimelineRow[];
    ad_types: AdTypeRow[];
    tags: AdTagRow[];
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

// ─── Constants & Common Helpers ────────────────────────────────────────────────

const CHART_COLORS = {
    primary: 'var(--color-brand-primary, #6c63ff)',
    blue: '#3b82f6',
    green: '#10b981',
    orange: '#f59e0b',
    purple: '#a855f7',
    red: '#ef4444',
    pink: '#ec4899',
    indigo: '#6366f1',
    teal: '#14b8a6'
};

const PIE_PALETTES = {
    accounts: [CHART_COLORS.primary, CHART_COLORS.blue, CHART_COLORS.green],
    churn: [CHART_COLORS.green, CHART_COLORS.orange, CHART_COLORS.red],
    formats: [CHART_COLORS.primary, CHART_COLORS.blue],
    privacy: [CHART_COLORS.green, CHART_COLORS.orange],
    ads: [CHART_COLORS.primary, CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.purple],
    providers: [CHART_COLORS.green, CHART_COLORS.blue, CHART_COLORS.orange, CHART_COLORS.purple, CHART_COLORS.pink]
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
    itemStyle: {
        color: '#fff'
    },
    labelStyle: {
        color: 'rgba(255,255,255,0.6)',
        fontWeight: 'bold'
    }
};

const formatLabel = (val: string) => {
    return val.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const formatCurrency = (val: number) => {
    return '$' + Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const formatXAxisDate = (tickItem: string) => {
    try {
        return new Date(tickItem).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
        return tickItem;
    }
};

const renderTooltipContent = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(19, 19, 26, 0.95)',
                border: '1px solid var(--color-interface-outline, rgba(255,255,255,0.08))',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '13px',
                backdropFilter: 'blur(8px)'
            }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                    {label ? formatXAxisDate(label) : ''}
                </p>
                {payload.map((pld: any, index: number) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: pld.color || pld.fill }} />
                        <span>{pld.name}: {pld.value.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

function EmptyState({ message, height = 240 }: { message: string; height?: number }) {
    return <SharedEmptyState message={message} height={height} />;
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

    const accountTypes = (data?.account_types || [])
        .filter(t => t.account_type !== 'platform')
        .map(t => ({
            name: formatLabel(t.account_type),
            value: t.count
        }));

    const churnData = (data?.churn_risk || []).map(c => ({
        name: c.status === 'active' ? 'Active (Last 7d)' : c.status === 'lapsing' ? 'Lapsing (8-30d)' : 'Inactive (>30d)',
        value: c.count
    }));

    const accountCreation = data?.account_creation || [];

    return (
        <div className={styles.tabContent}>
            <div className={styles.splitRow}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Account Type Distribution</h3>
                    {accountTypes.length > 0 ? (
                        <div style={{ width: '100%', height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <PieChart>
                                    <Pie
                                        data={accountTypes}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {accountTypes.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_PALETTES.accounts[index % PIE_PALETTES.accounts.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip {...TOOLTIP_STYLE} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState message="No account type data available" height={240} />
                    )}
                </div>

                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>User Engagement (Churn Risk)</h3>
                    {churnData.length > 0 ? (
                        <div style={{ width: '100%', height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <PieChart>
                                    <Pie
                                        data={churnData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {churnData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_PALETTES.churn[index % PIE_PALETTES.churn.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip {...TOOLTIP_STYLE} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState message="No engagement data available" height={240} />
                    )}
                </div>
            </div>

            <div className={styles.card} style={{ marginTop: '24px' }}>
                <h3 className={styles.cardTitle}>Account Creation Trend (Last 30 Days)</h3>
                {accountCreation.length > 0 ? (
                    <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={accountCreation} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSignup" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="day" tickFormatter={formatXAxisDate} stroke="rgba(255,255,255,0.3)" style={{ fontSize: '12px' }} />
                                <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: '12px' }} />
                                <Tooltip content={renderTooltipContent} />
                                <Area type="monotone" dataKey="count" name="Accounts Created" stroke={CHART_COLORS.primary} fillOpacity={1} fill="url(#colorSignup)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <EmptyState message="No creation trend data available" height={280} />
                )}
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
                    categories: [], 
                    tags: [] 
                };
            } catch (err) {
                throw err;
            }
        }
    );

    if (isLoading) return <div className={styles.loading}>Loading Events...</div>;

    const categories = (data?.categories || []).slice(0, 5).map(c => ({
        name: c.category,
        count: c.count
    }));

    const tags = (data?.tags || []).slice(0, 5).map(t => ({
        name: `#${t.tag}`,
        count: t.count
    }));

    const timeline = data?.timeline || [];

    return (
        <div className={styles.tabContent}>
            <div className={styles.splitRow}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Top Event Categories</h3>
                    {categories.length > 0 ? (
                        <div style={{ width: '100%', height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={categories} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                    <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                    <Tooltip {...TOOLTIP_STYLE} />
                                    <Bar dataKey="count" name="Events" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState message="No category data available" height={240} />
                    )}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Trending Event Tags</h3>
                    {tags.length > 0 ? (
                        <div style={{ width: '100%', height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={tags} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                    <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                    <Tooltip {...TOOLTIP_STYLE} />
                                    <Bar dataKey="count" name="Uses" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState message="No tag data available" height={240} />
                    )}
                </div>
            </div>

            <div className={styles.card} style={{ marginTop: '24px' }}>
                <h3 className={styles.cardTitle}>Event Creation Velocity (Last 30 Days)</h3>
                {timeline.length > 0 ? (
                    <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="day" tickFormatter={formatXAxisDate} stroke="rgba(255,255,255,0.3)" style={{ fontSize: '12px' }} />
                                <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: '12px' }} />
                                <Tooltip content={renderTooltipContent} />
                                <Area type="monotone" dataKey="count" name="Events Created" stroke={CHART_COLORS.primary} fillOpacity={1} fill="url(#colorEvents)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <EmptyState message="No timeline data available" height={260} />
                )}
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
                    tags: [] 
                };
            } catch (err) {
                throw err;
            }
        }
    );

    if (isLoading) return <div className={styles.loading}>Loading Advertising...</div>;

    const timeline = data?.timeline || [];
    const adTypes = (data?.ad_types || []).map(t => ({
        name: formatLabel(t.ad_type),
        value: t.count
    }));
    const tags = (data?.tags || []).slice(0, 5).map(t => ({
        name: `#${t.tag}`,
        count: t.count
    }));

    return (
        <div className={styles.tabContent}>
            <div className={styles.splitRow}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Ad Type Distribution</h3>
                    {adTypes.length > 0 ? (
                        <div style={{ width: '100%', height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <PieChart>
                                    <Pie
                                        data={adTypes}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {adTypes.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_PALETTES.ads[index % PIE_PALETTES.ads.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip {...TOOLTIP_STYLE} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState message="No ad type data available" height={240} />
                    )}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Trending Campaign Tags</h3>
                    {tags.length > 0 ? (
                        <div style={{ width: '100%', height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={tags} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                    <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                    <Tooltip {...TOOLTIP_STYLE} />
                                    <Bar dataKey="count" name="Uses" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState message="No tag data available" height={240} />
                    )}
                </div>
            </div>

            <div className={styles.card} style={{ marginTop: '24px' }}>
                <h3 className={styles.cardTitle}>Active Campaign Creation Timeline</h3>
                {timeline.length > 0 ? (
                    <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorAds" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="day" tickFormatter={formatXAxisDate} stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                <Tooltip content={renderTooltipContent} />
                                <Area type="monotone" dataKey="count" name="Campaigns" stroke={CHART_COLORS.primary} fillOpacity={1} fill="url(#colorAds)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <EmptyState message="No timeline data available" height={260} />
                )}
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

    const byMembers = (data?.by_members || []).slice(0, 5);
    const byMessages = (data?.by_messages || []).slice(0, 5);
    const byMedia = (data?.by_media || []).slice(0, 5);

    return (
        <div className={styles.tabContent}>
            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Top Forums by Member Count</h3>
                {byMembers.length > 0 ? (
                    <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={byMembers} layout="vertical" margin={{ top: 10, right: 10, left: 50, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                <YAxis dataKey="title" type="category" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                <Tooltip {...TOOLTIP_STYLE} />
                                <Bar dataKey="count" name="Members" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <EmptyState message="No forum member data available" height={260} />
                )}
            </div>

            <div className={styles.splitRow} style={{ marginTop: '24px' }}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Top Forums by Message Volume</h3>
                    {byMessages.length > 0 ? (
                        <div style={{ width: '100%', height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={byMessages} layout="vertical" margin={{ top: 10, right: 10, left: 50, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                    <YAxis dataKey="title" type="category" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                    <Tooltip {...TOOLTIP_STYLE} />
                                    <Bar dataKey="count" name="Messages" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState message="No message volume data available" height={240} />
                    )}
                </div>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Top Forums by Shared Media</h3>
                    {byMedia.length > 0 ? (
                        <div style={{ width: '100%', height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={byMedia} layout="vertical" margin={{ top: 10, right: 10, left: 50, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                    <YAxis dataKey="title" type="category" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                    <Tooltip {...TOOLTIP_STYLE} />
                                    <Bar dataKey="count" name="Media Files" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState message="No shared media data available" height={240} />
                    )}
                </div>
            </div>
        </div>
    );
}

function FinanceTab({ countryFilter }: { countryFilter: string }) {
    const { data, isLoading } = useSupabaseQuery<RevenueData>(
        ['admin-analytics-finance', countryFilter],
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
                    subscriptions_by_plan: [] 
                };
            } catch (err) {
                throw err;
            }
        }
    );

    if (isLoading) return <div className={styles.loading}>Loading Finance...</div>;

    const byReason = (data?.by_reason || []).map(r => ({
        name: formatLabel(r.reason),
        amount: Number(r.gross_amount),
        count: r.count
    }));

    const byProvider = (data?.by_provider || []).map(p => ({
        name: p.provider_name,
        value: Number(p.gross_amount)
    }));

    const subscriptionsByPlan = (data?.subscriptions_by_plan || []).map(s => ({
        name: formatLabel(s.plan_id),
        amount: Number(s.gross_amount),
        count: s.count
    }));

    return (

        <div className={styles.tabContent}>
            <div className={styles.splitRow}>
            <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Transactions by Payment Provider</h3>
                    {byProvider.length > 0 ? (
                        <div style={{ width: '100%', height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <PieChart>
                                    <Pie
                                        data={byProvider}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {byProvider.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_PALETTES.providers[index % PIE_PALETTES.providers.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Gross Volume']} {...TOOLTIP_STYLE} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState message="No provider data available" height={240} />
                    )}
                </div>

                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Transactions by Reason</h3>
                    {byReason.length > 0 ? (
                        <div style={{ width: '100%', height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={byReason} layout="vertical" margin={{ top: 10, right: 10, left: 40, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} tickFormatter={formatCurrency} />
                                    <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                    <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Gross Volume']} {...TOOLTIP_STYLE} />
                                    <Bar dataKey="amount" name="Volume" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState message="No transaction data available" height={240} />
                    )}
                </div>
            </div>

            <div className={styles.card} style={{ marginTop: '24px' }}>
                <h3 className={styles.cardTitle}>Subscriptions by Plan</h3>
                {subscriptionsByPlan.length > 0 ? (
                    <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={subscriptionsByPlan} layout="vertical" margin={{ top: 10, right: 10, left: 40, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} tickFormatter={formatCurrency} />
                                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                                <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Volume']} {...TOOLTIP_STYLE} />
                                <Bar dataKey="amount" name="Volume" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <EmptyState message="No subscription plan data available" height={260} />
                )}
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
        (['demographics', 'events', 'advertising', 'community', 'finance'].includes(initialTab) ? initialTab as Tab : 'demographics')
    );

    // Lock local territory analytics to the active administrator's country_code
    const activeCountry = activeAccount?.country_code || 'KE';
    const [countryFilter] = useState(activeCountry.toLowerCase());

    useEffect(() => {
        const tab = searchParams.get('tab') as Tab;
        if (tab && ['demographics', 'events', 'advertising', 'community', 'finance'].includes(tab)) {
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
                            <TabsTrigger value="finance">Finance</TabsTrigger>
                        </TabsList>
                    </div>
                </Tabs>
            </div>

            {activeTab === 'demographics' && <DemographicTab countryFilter={countryFilter} />}
            {activeTab === 'events' && <EventTab countryFilter={countryFilter} />}
            {activeTab === 'advertising' && <AdvertisingTab countryFilter={countryFilter} />}
            {activeTab === 'community' && <CommunityTab countryFilter={countryFilter} />}
            {activeTab === 'finance' && <FinanceTab countryFilter={countryFilter} />}
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
