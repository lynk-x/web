"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import styles from './page.module.css';
import adminStyles from '../../../page.module.css';
import Link from 'next/link';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import { formatDate } from '@/utils/format';

interface AdMedia {
    id: string;
    campaign_id: string;
    media_type: string;
    call_to_action: string | null;
    url: string;
    is_primary: boolean;
    is_hidden: boolean;
    impressions_count: number;
    clicks_count: number;
    created_at: string;
}

const getVisibilityVariant = (isHidden: boolean): BadgeVariant =>
    isHidden ? 'neutral' : 'success';

const isImageType = (t: string) => t.toLowerCase().includes('image') || t.toLowerCase().includes('banner') || t.toLowerCase().includes('story');
const isVideoType = (t: string) => t.toLowerCase().includes('video');

export default function CampaignAssetsPage() {
    const { id: campaignId } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [assets, setAssets] = useState<AdMedia[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [campaignTitle, setCampaignTitle] = useState('');

    const fetchAssets = useCallback(async () => {
        if (!campaignId) return;
        setIsLoading(true);
        try {
            const [campaignRes, assetsRes] = await Promise.all([
                supabase.from('ad_campaigns').select('title').eq('id', campaignId).single(),
                supabase.from('ad_media').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false }),
            ]);
            if (campaignRes.data) setCampaignTitle(campaignRes.data.title);
            if (assetsRes.error) throw assetsRes.error;
            setAssets(assetsRes.data || []);
        } catch (e: unknown) {
            showToast(getErrorMessage(e) || 'Failed to load assets', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [campaignId, supabase, showToast]);

    useEffect(() => { fetchAssets(); }, [fetchAssets]);

    const updateVisibility = async (id: string, isHidden: boolean) => {
        try {
            const { error } = await supabase
                .from('ad_media')
                .update({ is_hidden: isHidden })
                .eq('id', id)
                .eq('campaign_id', campaignId);
            if (error) throw error;
            setAssets(prev => prev.map(a => a.id === id ? { ...a, is_hidden: isHidden } : a));
            showToast(isHidden ? 'Asset hidden' : 'Asset is now visible', 'success');
        } catch (e: unknown) {
            showToast(getErrorMessage(e) || 'Update failed', 'error');
        }
    };

    const showAllHidden = async () => {
        const hidden = assets.filter(a => a.is_hidden);
        if (hidden.length === 0) { showToast('No hidden assets', 'info'); return; }
        try {
            const { error } = await supabase
                .from('ad_media')
                .update({ is_hidden: false })
                .eq('campaign_id', campaignId)
                .eq('is_hidden', true);
            if (error) throw error;
            setAssets(prev => prev.map(a => ({ ...a, is_hidden: false })));
            showToast(`${hidden.length} asset${hidden.length > 1 ? 's' : ''} made visible`, 'success');
        } catch (e: unknown) {
            showToast(getErrorMessage(e) || 'Update failed', 'error');
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ flex: '1 1 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <Link href="/dashboard/admin/campaigns" className={styles.backLink}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                            Back to Campaigns
                        </Link>
                    </div>
                    <h1 className={adminStyles.title}>{campaignTitle || 'Ad Assets'}</h1>
                    <p className={adminStyles.subtitle}>Review and manage creative assets for this campaign.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className={adminStyles.btnPrimary} onClick={showAllHidden} disabled={isLoading || !assets.some(a => a.is_hidden)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Show All Hidden
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: 48, opacity: 0.5 }}>Loading assets...</div>
            ) : assets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, opacity: 0.5 }}>
                    <p>No ad assets found for this campaign.</p>
                </div>
            ) : (
                <div className={styles.gallery}>
                    {assets.map((asset) => (
                        <div key={asset.id} className={styles.assetCard}>
                            {/* Preview Area */}
                            <div className={styles.previewContainer}>
                                {isImageType(asset.media_type) ? (
                                    <div className={styles.imagePreview}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={asset.url}
                                            alt={asset.call_to_action || 'Ad asset'}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={e => {
                                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                ) : isVideoType(asset.media_type) ? (
                                    <div className={styles.videoPreview}>
                                        <video
                                            src={asset.url}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            muted
                                            preload="metadata"
                                        />
                                    </div>
                                ) : (
                                    <div className={styles.textPreview}>
                                        <p>"{asset.call_to_action || asset.url}"</p>
                                    </div>
                                )}

                                <div className={styles.statusOverlay}>
                                    <Badge
                                        label={asset.is_hidden ? 'HIDDEN' : 'VISIBLE'}
                                        variant={getVisibilityVariant(asset.is_hidden)}
                                    />
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className={styles.metaContainer}>
                                <div className={styles.metaRow}>
                                    <span className={styles.metaLabel}>Type</span>
                                    <span className={styles.metaValue} style={{ textTransform: 'capitalize' }}>
                                        {asset.media_type.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                {asset.call_to_action && (
                                    <div className={styles.metaRow}>
                                        <span className={styles.metaLabel}>CTA</span>
                                        <span className={styles.metaValue}>{asset.call_to_action}</span>
                                    </div>
                                )}
                                <div className={styles.metaRow}>
                                    <span className={styles.metaLabel}>Impressions</span>
                                    <span className={styles.metaValue}>{asset.impressions_count.toLocaleString()}</span>
                                </div>
                                <div className={styles.metaRow}>
                                    <span className={styles.metaLabel}>Clicks</span>
                                    <span className={styles.metaValue}>{asset.clicks_count.toLocaleString()}</span>
                                </div>
                                <div className={styles.metaRow}>
                                    <span className={styles.metaLabel}>Added</span>
                                    <span className={styles.metaValue}>{formatDate(asset.created_at)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className={styles.actionContainer}>
                                <button
                                    className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                    onClick={() => updateVisibility(asset.id, true)}
                                    disabled={asset.is_hidden}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                    Hide
                                </button>
                                <button
                                    className={`${styles.actionBtn} ${styles.approveBtn}`}
                                    onClick={() => updateVisibility(asset.id, false)}
                                    disabled={!asset.is_hidden}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    Show
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
