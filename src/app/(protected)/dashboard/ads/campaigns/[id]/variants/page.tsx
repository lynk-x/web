"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatNumber } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import Badge from '@/components/shared/Badge';
import Toggle from '@/components/shared/Toggle';
import Spinner from '@/components/shared/Spinner';
import EmptyState from '@/components/shared/EmptyState';
import { useConfirmModal } from '@/hooks/useConfirmModal';

interface AdVariant {
    id: string;
    created_at: string;
    url: string;
    media_type: string;
    call_to_action: string;
    is_primary: boolean;
    is_hidden: boolean;
    impressions_count: number;
    clicks_count: number;
}

export default function CampaignVariantsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { confirm, ConfirmDialog } = useConfirmModal();

    const [campaignTitle, setCampaignTitle] = useState('');
    const [campaignCreatedAt, setCampaignCreatedAt] = useState('');
    const [variants, setVariants] = useState<AdVariant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    const fetchVariants = useCallback(async () => {
        if (!id || !activeAccount) return;
        setIsLoading(true);
        try {
            const [campRes, variantRes] = await Promise.all([
                supabase.schema('api').from('v1_ad_campaigns').select('title, created_at').eq('id', id).eq('account_id', activeAccount.id).maybeSingle(),
                supabase
                    .schema('api')
                    .from('v1_ad_media')
                    .select('id, created_at, url, media_type, call_to_action, is_primary, is_hidden, impressions_count, clicks_count')
                    .eq('campaign_id', id)
                    .order('is_primary', { ascending: false }),
            ]);

            if (!campRes.data) {
                showToast('Campaign not found or access denied.', 'error');
                router.push('/dashboard/ads/campaigns');
                return;
            }
            if (variantRes.error) throw variantRes.error;

            setCampaignTitle(campRes.data.title);
            setCampaignCreatedAt(campRes.data.created_at);
            setVariants((variantRes.data || []) as AdVariant[]);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load creative variants.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, activeAccount, supabase, showToast, router]);

    useEffect(() => { fetchVariants(); }, [fetchVariants]);

    const handleToggleHidden = async (variant: AdVariant) => {
        if (!activeAccount) return;
        setBusyId(variant.id);
        try {
            const { error } = await supabase.schema('api').rpc('toggle_ad_media_visibility', {
                p_account_id: activeAccount.id,
                p_media_id: variant.id,
                p_media_created_at: variant.created_at,
                p_is_hidden: !variant.is_hidden,
            });
            if (error) throw error;
            showToast(variant.is_hidden ? 'Variant shown.' : 'Variant hidden.', 'success');
            fetchVariants();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to update variant.', 'error');
        } finally {
            setBusyId(null);
        }
    };

    const handleSetPrimary = async (variant: AdVariant) => {
        if (!activeAccount || variant.is_primary) return;
        setBusyId(variant.id);
        try {
            const { error } = await supabase.schema('api').rpc('set_primary_ad_media', {
                p_account_id: activeAccount.id,
                p_media_id: variant.id,
                p_media_created_at: variant.created_at,
            });
            if (error) throw error;
            showToast('Primary variant updated.', 'success');
            fetchVariants();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to set primary variant.', 'error');
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (variant: AdVariant, label: string) => {
        if (!activeAccount) return;
        const confirmed = await confirm(
            `Delete ${label}? This cannot be undone. Its impression/click history will be lost.`,
            { title: 'Delete Variant?', confirmLabel: 'Delete', variant: 'danger' }
        );
        if (!confirmed) return;

        setBusyId(variant.id);
        try {
            const { error } = await supabase.schema('api').rpc('delete_ad_media', {
                p_account_id: activeAccount.id,
                p_media_id: variant.id,
                p_media_created_at: variant.created_at,
            });
            if (error) throw error;
            showToast('Variant deleted.', 'success');
            fetchVariants();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to delete variant.', 'error');
        } finally {
            setBusyId(null);
        }
    };

    if (isLoading) {
        return (
            <div className={adminStyles.container}>
                <div style={{ padding: '60px', textAlign: 'center' }}>
                    <Spinner label="Loading creative variants..." />
                </div>
            </div>
        );
    }

    return (
        <div className={adminStyles.container}>
            {ConfirmDialog}
            <PageHeader
                title="Manage Variants"
                subtitle={campaignTitle}
                closeHref={`/dashboard/ads/campaigns/${id}`}
                primaryAction={{
                    label: 'Add / Replace Creatives',
                    onClick: () => router.push(`/dashboard/ads/campaigns/${id}/edit?createdAt=${encodeURIComponent(campaignCreatedAt)}`),
                }}
            />

            {variants.length === 0 ? (
                <EmptyState message="No creative variants found for this campaign." />
            ) : (
                <div className={adminStyles.pageCard}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-interface-outline)', textAlign: 'left' }}>
                                    <th style={thStyle}>Preview</th>
                                    <th style={thStyle}>CTA</th>
                                    <th style={thStyle}>Impressions</th>
                                    <th style={thStyle}>Clicks</th>
                                    <th style={thStyle}>CTR</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {variants.map((v, i) => {
                                    const vCtr = v.impressions_count > 0 ? (v.clicks_count / v.impressions_count) * 100 : 0;
                                    const label = v.is_primary ? 'Primary' : `Variant ${String.fromCharCode(65 + i)}`;
                                    const isBusy = busyId === v.id;
                                    return (
                                        <tr key={v.id} style={{ borderBottom: '1px solid var(--color-interface-outline)', opacity: v.is_hidden ? 0.5 : 1 }}>
                                            <td style={tdStyle}>
                                                <div style={{ width: '56px', height: '56px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                                                    {v.media_type === 'video' ? (
                                                        <video src={v.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                                                    ) : (
                                                        <img src={v.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ ...tdStyle, opacity: 0.7 }}>{v.call_to_action || '-'}</td>
                                            <td style={tdStyle}>{formatNumber(v.impressions_count)}</td>
                                            <td style={tdStyle}>{formatNumber(v.clicks_count)}</td>
                                            <td style={tdStyle}>{vCtr.toFixed(2)}%</td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    {v.is_primary && <Badge label="Primary" variant="primary" />}
                                                    {v.is_hidden
                                                        ? <Badge label="Hidden" variant="error" />
                                                        : <Badge label="Active" variant="success" />}
                                                    {!v.is_primary && !v.is_hidden && <span style={{ fontSize: '12px', opacity: 0.5 }}>{label}</span>}
                                                </div>
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    {!v.is_primary && (
                                                        <button
                                                            className={adminStyles.btnSecondary}
                                                            style={{ padding: '6px 10px', fontSize: '12px' }}
                                                            disabled={isBusy}
                                                            onClick={() => handleSetPrimary(v)}
                                                        >
                                                            Make Primary
                                                        </button>
                                                    )}
                                                    <Toggle
                                                        enabled={!v.is_hidden}
                                                        onChange={() => handleToggleHidden(v)}
                                                        disabled={isBusy}
                                                        label="Visible"
                                                    />
                                                    <button
                                                        className={adminStyles.btnDanger}
                                                        style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        disabled={isBusy || variants.length <= 1}
                                                        title={variants.length <= 1 ? 'A campaign must have at least one creative' : 'Delete variant'}
                                                        onClick={() => handleDelete(v, label)}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6" />
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                            <line x1="10" y1="11" x2="10" y2="17" />
                                                            <line x1="14" y1="11" x2="14" y2="17" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
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
