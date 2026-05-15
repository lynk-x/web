"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, Legend
} from 'recharts';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import SubPageHeader from '@/components/shared/SubPageHeader';
import Badge from '@/components/shared/Badge';
import type { BadgeVariant } from '@/types/shared';
import StatCard from '@/components/dashboard/StatCard';
import ProductTour from '@/components/dashboard/ProductTour';

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
    draft: { label: 'Draft', variant: 'subtle' },
    pending_approval: { label: 'Pending Approval', variant: 'warning' },
    active: { label: 'Active', variant: 'success' },
    paused: { label: 'Paused', variant: 'neutral' },
    completed: { label: 'Completed', variant: 'info' },
    rejected: { label: 'Rejected', variant: 'error' },
};

const TYPE_LABELS: Record<string, string> = {
    banner: 'Banner',
    interstitial: 'Interstitial',
    interstitial_video: 'Interstitial Video',
};

const VARIANT_COLORS = ['#20F928', '#0088FE', '#FFBB28'];

interface CampaignDetail {
    id: string;
    title: string;
    description: string;
    type: string;
    status: string;
    start_at: string;
    end_at: string;
    total_budget: number;
    daily_limit: number;
    spent_amount: number;
    remaining_budget: number;
    currency: string;
    max_bid_amount: number;
    total_impressions: number;
    total_clicks: number;
    destination_url: string;
    target_event_id: string | null;
    reviewed_at: string | null;
    reviewed_by: string | null;
    metadata: any;
    created_at: string;
}

interface AdVariant {
    id: string;
    url: string;
    media_type: string;
    call_to_action: string;
    is_primary: boolean;
    is_hidden: boolean;
    impressions_count: number;
    clicks_count: number;
}

interface DayPoint {
    name: string;
    impressions: number;
    clicks: number;
    sortKey: number;
}

export default function CampaignDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
    const [variants, setVariants] = useState<AdVariant[]>([]);
    const [performanceData, setPerformanceData] = useState<DayPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
    const [timeRange, setTimeRange] = useState(30);

    const fetchCampaign = useCallback(async () => {
        if (!id || !activeAccount) return;
        setIsLoading(true);
        try {
            const [campRes, variantRes] = await Promise.all([
                supabase
                    .from('ad_campaigns')
                    .select('*')
                    .eq('id', id)
                    .eq('account_id', activeAccount.id)
                    .maybeSingle(),
                supabase
                    .from('ad_media')
                    .select('id, url, media_type, call_to_action, is_primary, is_hidden, impressions_count, clicks_count')
                    .eq('campaign_id', id)
                    .order('is_primary', { ascending: false })
            ]);

            if (campRes.error) throw campRes.error;
            if (!campRes.data) {
                showToast('Campaign not found or access denied.', 'error');
                router.push('/dashboard/ads/campaigns');
                return;
            }

            setCampaign(campRes.data as CampaignDetail);
            setVariants((variantRes.data || []) as AdVariant[]);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load campaign.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, activeAccount, supabase, showToast, router]);

    const fetchAnalytics = useCallback(async () => {
        if (!id) return;
        setIsAnalyticsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_campaign_performance_metrics', {
                p_campaign_id: id,
                p_days: timeRange
            });

            if (error) throw error;

            const formatted = (data || []).map((d: any) => {
                const date = new Date(d.day);
                const label = timeRange <= 7
                    ? date.toLocaleDateString('en-US', { weekday: 'short' })
                    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return {
                    name: label,
                    impressions: Number(d.impressions),
                    clicks: Number(d.clicks),
                    sortKey: date.getTime()
                };
            });

            setPerformanceData(formatted);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load analytics', 'error');
        } finally {
            setIsAnalyticsLoading(false);
        }
    }, [id, supabase, timeRange, showToast]);

    useEffect(() => { fetchCampaign(); }, [fetchCampaign]);
    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const handleStatusChange = async (newStatus: 'active' | 'paused') => {
        if (!campaign) return;
        try {
            const { error } = await supabase
                .from('ad_campaigns')
                .update({ status: newStatus })
                .eq('id', campaign.id);
            if (error) throw error;
            showToast(`Campaign ${newStatus === 'paused' ? 'paused' : 'activated'}.`, 'success');
            fetchCampaign();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to update status.', 'error');
        }
    };

    if (isLoading || !campaign) {
        return (
            <div className={adminStyles.container}>
                <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
                    {isLoading ? 'Loading campaign...' : 'Campaign not found.'}
                </div>
            </div>
        );
    }

    const badge = STATUS_MAP[campaign.status] || { label: campaign.status, variant: 'neutral' as BadgeVariant };
    const ctr = campaign.total_impressions > 0 ? (campaign.total_clicks / campaign.total_impressions) * 100 : 0;
    const cpc = campaign.total_clicks > 0 ? campaign.spent_amount / campaign.total_clicks : 0;
    const budgetUsed = campaign.total_budget > 0 ? (campaign.spent_amount / campaign.total_budget) * 100 : 0;
    const rejectionReason = campaign.metadata?.rejection_reason || campaign.metadata?.review_notes;

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title={campaign.title}
                subtitle={`${TYPE_LABELS[campaign.type] || campaign.type} \u00B7 ${formatDate(campaign.start_at)} \u2013 ${formatDate(campaign.end_at)}`}
                backLabel="Back to Campaigns"
                badge={badge}
                primaryAction={campaign.status === 'active' ? {
                    label: 'Pause Campaign',
                    onClick: () => handleStatusChange('paused'),
                } : campaign.status === 'paused' ? {
                    label: 'Resume Campaign',
                    onClick: () => handleStatusChange('active'),
                } : campaign.status === 'rejected' ? {
                    label: 'Edit & Resubmit',
                    onClick: () => router.push(`/dashboard/ads/campaigns/${id}/edit`),
                } : undefined}
                secondaryAction={{
                    label: 'Edit',
                    onClick: () => router.push(`/dashboard/ads/campaigns/${id}/edit`),
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                }}
            />

            {/* Rejection / Pending Approval Banner */}
            {campaign.status === 'rejected' && (
                <div style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    marginBottom: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--color-interface-error)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        Campaign Rejected
                    </div>
                    <p style={{ fontSize: '14px', opacity: 0.8, margin: 0 }}>
                        {rejectionReason || 'No reason provided. Contact support for more details.'}
                    </p>
                    {campaign.reviewed_at && (
                        <p style={{ fontSize: '12px', opacity: 0.5, margin: 0 }}>Reviewed on {formatDate(campaign.reviewed_at)}</p>
                    )}
                    <Link
                        href={`/dashboard/ads/campaigns/${id}/edit`}
                        style={{ color: 'var(--color-brand-primary)', fontSize: '14px', fontWeight: 500, textDecoration: 'none', marginTop: '4px' }}
                    >
                        Edit and resubmit
                    </Link>
                </div>
            )}

            {campaign.status === 'pending_approval' && (
                <div style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(250, 204, 21, 0.08)',
                    border: '1px solid rgba(250, 204, 21, 0.2)',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#facc15' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span style={{ fontSize: '14px' }}>Your campaign is under review. This typically takes 1-2 business days.</span>
                </div>
            )}

            {/* KPI Stats */}
            <div className={`${adminStyles.statsGrid} tour-campaign-stats`} style={{ marginBottom: '28px' }}>
                <StatCard label="Impressions" value={formatNumber(campaign.total_impressions)} trend="neutral" />
                <StatCard label="Clicks" value={formatNumber(campaign.total_clicks)} trend="neutral" />
                <StatCard label="CTR" value={`${ctr.toFixed(2)}%`} trend="neutral" />
                <StatCard label="CPC" value={formatCurrency(cpc, campaign.currency)} trend="neutral" />
                <StatCard label="Spent" value={formatCurrency(campaign.spent_amount, campaign.currency)} trend="neutral" change={`${budgetUsed.toFixed(0)}% of budget`} />
                <StatCard label="Remaining" value={formatCurrency(campaign.remaining_budget, campaign.currency)} trend="neutral" />
            </div>

            {/* Performance Chart */}
            <div className={`${adminStyles.pageCard} tour-campaign-chart`} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 className={adminStyles.sectionTitle} style={{ margin: 0 }}>Performance Over Time</h2>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(Number(e.target.value))}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--color-interface-outline)',
                            color: 'var(--color-utility-primaryText)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                        }}
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={90}>Last 90 Days</option>
                    </select>
                </div>
                <div style={{ width: '100%', height: 280, position: 'relative' }}>
                    {isAnalyticsLoading && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', zIndex: 1, fontSize: '13px', opacity: 0.6 }}>
                            Updating...
                        </div>
                    )}
                    <ResponsiveContainer>
                        <AreaChart data={performanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="cImp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#20f928" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#20f928" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="cClk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="rgba(255,255,255,0.4)" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="rgba(255,255,255,0.4)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-interface-surface)', border: '1px solid var(--color-interface-outline)', borderRadius: '8px' }} />
                            <Legend />
                            <Area type="monotone" dataKey="impressions" stroke="#20f928" fillOpacity={1} fill="url(#cImp)" strokeWidth={2} />
                            <Area type="monotone" dataKey="clicks" stroke="rgba(255,255,255,0.5)" fillOpacity={1} fill="url(#cClk)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* A/B Variant Comparison */}
            {variants.length > 0 && (
                <div className={adminStyles.pageCard} style={{ marginBottom: '24px' }}>
                    <h2 className={adminStyles.sectionTitle}>Creative Variants {variants.length > 1 ? '(A/B Test)' : ''}</h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-interface-outline)', textAlign: 'left' }}>
                                    <th style={thStyle}>Variant</th>
                                    <th style={thStyle}>CTA</th>
                                    <th style={thStyle}>Impressions</th>
                                    <th style={thStyle}>Clicks</th>
                                    <th style={thStyle}>CTR</th>
                                    <th style={thStyle}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {variants.map((v, i) => {
                                    const vCtr = v.impressions_count > 0 ? (v.clicks_count / v.impressions_count) * 100 : 0;
                                    const label = v.is_primary ? 'Primary' : `Variant ${String.fromCharCode(65 + i)}`;
                                    return (
                                        <tr key={v.id} style={{ borderBottom: '1px solid var(--color-interface-outline)' }}>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: VARIANT_COLORS[i % VARIANT_COLORS.length] }} />
                                                    <span style={{ fontWeight: 500 }}>{label}</span>
                                                    {v.is_primary && <Badge label="Primary" variant="primary" />}
                                                </div>
                                            </td>
                                            <td style={{ ...tdStyle, opacity: 0.7 }}>{v.call_to_action || '-'}</td>
                                            <td style={tdStyle}>{formatNumber(v.impressions_count)}</td>
                                            <td style={tdStyle}>{formatNumber(v.clicks_count)}</td>
                                            <td style={tdStyle}>
                                                <span style={{ color: vCtr > ctr ? 'var(--color-interface-success)' : 'inherit', fontWeight: vCtr > ctr ? 600 : 400 }}>
                                                    {vCtr.toFixed(2)}%
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                {v.is_hidden
                                                    ? <Badge label="Hidden" variant="error" />
                                                    : <Badge label="Active" variant="success" />
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Visual bar comparison */}
                    {variants.length > 1 && (
                        <div style={{ marginTop: '20px', height: 200 }}>
                            <ResponsiveContainer>
                                <BarChart data={variants.map((v, i) => ({
                                    name: v.is_primary ? 'Primary' : `Variant ${String.fromCharCode(65 + i)}`,
                                    impressions: v.impressions_count,
                                    clicks: v.clicks_count,
                                    ctr: v.impressions_count > 0 ? (v.clicks_count / v.impressions_count) * 100 : 0,
                                }))}>
                                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-interface-surface)', border: '1px solid var(--color-interface-outline)', borderRadius: '8px' }} />
                                    <Legend />
                                    <Bar dataKey="impressions" fill="#20f928" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="clicks" fill="rgba(255,255,255,0.3)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* Campaign Details Card */}
            <div className={adminStyles.pageCard}>
                <h2 className={adminStyles.sectionTitle}>Campaign Details</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                    <DetailRow label="Destination URL" value={campaign.destination_url} isLink />
                    <DetailRow label="Max Bid" value={formatCurrency(campaign.max_bid_amount, campaign.currency)} />
                    <DetailRow label="Daily Limit" value={campaign.daily_limit ? formatCurrency(campaign.daily_limit, campaign.currency) : 'No limit'} />
                    <DetailRow label="Budget" value={formatCurrency(campaign.total_budget, campaign.currency)} />
                    <DetailRow label="Currency" value={campaign.currency} />
                    <DetailRow label="Created" value={formatDate(campaign.created_at)} />
                    {campaign.reviewed_at && (
                        <DetailRow label="Reviewed" value={formatDate(campaign.reviewed_at)} />
                    )}
                </div>
            </div>
            <ProductTour
                storageKey={activeAccount ? `hasSeenAdsCampaignDetailJoyride_${activeAccount.id}` : 'hasSeenAdsCampaignDetailJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Campaign Intelligence',
                        content: 'This deep-dive view provides real-time performance data and creative A/B testing results for this specific campaign.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-campaign-stats',
                        title: 'Performance Snapshot',
                        content: 'Track your primary success metrics including Click-Through Rate (CTR) and Cost Per Click (CPC) to measure ROI.',
                    },
                    {
                        target: '.tour-campaign-chart',
                        title: 'Delivery Trends',
                        content: 'Visualize how your ads are being delivered over time. Use the date range selector to analyze specific periods.',
                    }
                ]}
            />
        </div>
    );
}

// ── Helper Components ──────────────────────────────────────────────────────

function DetailRow({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
            {isLink ? (
                <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-brand-primary)', textDecoration: 'none', wordBreak: 'break-all' }}>
                    {value}
                </a>
            ) : (
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{value}</span>
            )}
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    opacity: 0.5,
    fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
    padding: '14px 16px',
};
