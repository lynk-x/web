"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import type { BadgeVariant } from '@/types/shared';
import StatCard from '@/components/dashboard/StatCard';
import ProductTour from '@/components/dashboard/ProductTour';
import Spinner from '@/components/shared/Spinner';
import EmptyState from '@/components/shared/EmptyState';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import QuickLinksRow, { QuickLink, CopyableLinkChip } from '@/components/shared/QuickLinksRow';
import AdPreviewMock from '@/components/ads/campaigns/AdPreviewMock';

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
    reference: string;
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

export default function CampaignDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { confirm, ConfirmDialog } = useConfirmModal();

    const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
    const [variants, setVariants] = useState<AdVariant[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCampaign = useCallback(async () => {
        if (!id || !activeAccount) return;
        setIsLoading(true);
        try {
            const [campRes, variantRes] = await Promise.all([
                supabase
                    .schema('api')
                    .from('v1_ad_campaigns')
                    .select('*')
                    .eq('id', id)
                    .eq('account_id', activeAccount.id)
                    .maybeSingle(),
                supabase
                    .schema('api')
                    .from('v1_ad_media')
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

    useEffect(() => { fetchCampaign(); }, [fetchCampaign]);

    const handleStatusChange = async (newStatus: 'active' | 'paused') => {
        if (!campaign || !activeAccount) return;
        if (newStatus === 'paused') {
            const confirmed = await confirm(
                'Pausing this campaign stops ad delivery and spend immediately. You can resume it at any time.',
                { title: 'Pause Campaign?', confirmLabel: 'Pause Campaign', variant: 'danger' }
            );
            if (!confirmed) return;
        }
        try {
            const { error } = await supabase.schema('api').rpc('bulk_toggle_campaigns', {
                p_account_id: activeAccount.id,
                p_campaigns: [{ id: campaign.id, created_at: campaign.created_at }],
                p_status: newStatus
            });
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
                {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%' }}>
                        <Spinner label="Loading campaign..." centered />
                    </div>
                ) : (
                    <EmptyState message="Campaign not found." />
                )}
            </div>
        );
    }

    const badge = STATUS_MAP[campaign.status] || { label: campaign.status, variant: 'neutral' as BadgeVariant };
    const budgetUsed = campaign.total_budget > 0 ? (campaign.spent_amount / campaign.total_budget) * 100 : 0;
    const rejectionReason = campaign.metadata?.rejection_reason || campaign.metadata?.review_notes;
    const primaryVariant = variants.find(v => v.is_primary) || variants[0];

    return (
        <div className={adminStyles.container}>
            {ConfirmDialog}
            <PageHeader
                title={campaign.title}
                subtitle={campaign.reference}
                closeHref="/dashboard/ads/campaigns"
                badge={badge}
                primaryAction={{
                    label: campaign.status === 'rejected' ? 'Edit & Resubmit' : 'Edit Campaign',
                    onClick: () => router.push(`/dashboard/ads/campaigns/${id}/edit?createdAt=${encodeURIComponent(campaign.created_at)}`),
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                }}
                secondaryAction={campaign.status === 'active' ? {
                    label: 'Pause Campaign',
                    onClick: () => handleStatusChange('paused'),
                    className: adminStyles.btnDanger,
                } : campaign.status === 'paused' ? {
                    label: 'Resume Campaign',
                    onClick: () => handleStatusChange('active'),
                } : undefined}
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
                        href={`/dashboard/ads/campaigns/${id}/edit?createdAt=${encodeURIComponent(campaign.created_at)}`}
                        style={{ color: 'var(--color-brand-primary)', fontSize: '14px', fontWeight: 500, textDecoration: 'none', marginTop: '4px' }}
                    >
                        Edit and resubmit
                    </Link>
                </div>
            )}

            {campaign.status === 'pending_approval' && (
                <div style={{
                    padding: '4px 20px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(250, 204, 21, 0.08)',
                    border: '1px solid rgba(250, 204, 21, 0.2)',
                    marginBottom: '8px',
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
                <StatCard label="Spent" value={formatCurrency(campaign.spent_amount, campaign.currency)} trend="neutral" change={`${budgetUsed.toFixed(0)}% of budget`} />
                <StatCard label="Remaining" value={formatCurrency(campaign.remaining_budget, campaign.currency)} trend="neutral" />
            </div>

            {/* Quick Links */}
            <QuickLinksRow className="tour-campaign-links">
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <QuickLink href={`/dashboard/ads/campaigns/${id}/variants`} label="Manage Variants" />
                    <QuickLink href={`/dashboard/ads/campaigns/${id}/audience`} label="View Audience" />
                    <QuickLink href={`/dashboard/ads/analytics/campaign/${id}`} label="Analytics" />
                </div>
                {campaign && (
                    <CopyableLinkChip label="DESTINATION URL" url={campaign.destination_url} />
                )}
            </QuickLinksRow>

            <div className={adminStyles.subPageGrid}>
                {/* Left Column: Details + Variants */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Campaign Details Card */}
                    <div className={`${adminStyles.pageCard} tour-campaign-details`}>
                        <h2 className={adminStyles.sectionTitle}>Campaign Details</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                            <DetailRow label="Type" value={TYPE_LABELS[campaign.type] || campaign.type} />
                            <DetailRow label="Schedule" value={`${formatDate(campaign.start_at)} – ${formatDate(campaign.end_at)}`} />
                            <DetailRow label="Max Bid" value={campaign.max_bid_amount != null ? formatCurrency(campaign.max_bid_amount, campaign.currency) : 'Not set'} />
                            <DetailRow label="Daily Limit" value={campaign.daily_limit ? formatCurrency(campaign.daily_limit, campaign.currency) : 'No limit'} />
                            <DetailRow label="Budget" value={formatCurrency(campaign.total_budget, campaign.currency)} />
                            <DetailRow label="Currency" value={campaign.currency} />
                            <DetailRow label="Created" value={formatDate(campaign.created_at)} />
                            {campaign.reviewed_at && (
                                <DetailRow label="Reviewed" value={formatDate(campaign.reviewed_at)} />
                            )}
                        </div>

                        {campaign.description && (
                            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-interface-outline)' }}>
                                <p style={{ fontSize: '13px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</p>
                                <p style={{ fontSize: '14px', lineHeight: '1.6', opacity: 0.8, whiteSpace: 'pre-wrap' }}>{campaign.description}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Live Preview */}
                <div className="tour-campaign-preview" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <h2 className={adminStyles.sectionTitle}>Live Preview</h2>
                    <AdPreviewMock
                        type={campaign.type}
                        title={campaign.title}
                        headline={primaryVariant?.call_to_action}
                        mediaUrl={primaryVariant?.url}
                        mediaType={primaryVariant?.media_type}
                    />
                </div>
            </div>

            <ProductTour
                storageKey={activeAccount ? `hasSeenAdsCampaignDetailJoyride_${activeAccount.id}` : 'hasSeenAdsCampaignDetailJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Campaign Deep Dive',
                        content: 'This is your single-campaign command center. See real-time performance data, manage your creative variants and review all delivery settings for this specific campaign.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-campaign-stats',
                        title: 'Core Performance Metrics',
                        content: 'CTR (Click-Through Rate) measures how compelling your ad is — the higher, the better. CPC (Cost Per Click) shows your average cost efficiency. Track both to identify when to pause or boost a campaign.',
                    },
                    {
                        target: '.tour-campaign-links',
                        title: 'Quick Actions',
                        content: 'Manage your creative variants (hide, delete or set a new primary), jump to the audience and analytics breakdowns, or edit the campaign\'s settings.',
                    },
                    {
                        target: '.tour-campaign-details',
                        title: 'Delivery Configuration',
                        content: 'Review the budget ceiling, max bid amount and campaign dates. These settings control how aggressively your ad competes in the auction and how long it runs.',
                    },
                    {
                        target: '.tour-campaign-preview',
                        title: 'Live Preview',
                        content: 'See how your primary creative currently renders in the Lynk-X app — the same mockup you saw while creating the campaign.',
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
