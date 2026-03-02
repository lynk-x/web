"use client";

import React from 'react';
import styles from './CampaignDetail.module.css';
import { Campaign } from '@/types/admin';
import Badge from '../../../shared/Badge';
import { formatCurrency, formatNumber, formatString } from '@/utils/format';
import adminStyles from '../../../../app/dashboard/admin/page.module.css';

interface CampaignDetailProps {
    campaign: Campaign;
    onStatusChange?: (id: string, newStatus: string) => void;
}

export default function CampaignDetail({ campaign, onStatusChange }: CampaignDetailProps) {
    return (
        <div className={styles.container}>
            <div className={styles.layoutWrapper}>
                <div className={styles.detailsColumn}>
                    <div className={styles.section}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 className={styles.sectionTitle}>Campaign Metrics</h2>
                            <Badge
                                label={formatString(campaign.status)}
                                variant={campaign.status === 'active' ? 'success' : campaign.status === 'draft' ? 'warning' : 'neutral'}
                                showDot
                            />
                        </div>

                        <div className={styles.grid}>
                            <div className={styles.card}>
                                <span className={styles.label}>Total Budget</span>
                                <span className={styles.value}>{formatCurrency(campaign.budget)}</span>
                            </div>
                            <div className={styles.card}>
                                <span className={styles.label}>Actual Spend</span>
                                <span className={styles.value}>{formatCurrency(campaign.spend)}</span>
                            </div>
                            <div className={styles.card}>
                                <span className={styles.label}>Impressions</span>
                                <span className={styles.value}>{formatNumber(campaign.impressions)}</span>
                            </div>
                            <div className={styles.card}>
                                <span className={styles.label}>Total Clicks</span>
                                <span className={styles.value}>{formatNumber(campaign.clicks)}</span>
                            </div>
                            <div className={styles.card}>
                                <span className={styles.label}>CTR</span>
                                <span className={styles.value}>
                                    {campaign.impressions > 0
                                        ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) + '%'
                                        : '0.00%'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Ad Copy & Creative</h2>
                        <div className={styles.creative}>
                            <div className={styles.adImage}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                            </div>
                            <div className={styles.adContent}>
                                <h3 className={styles.adTitle}>{campaign.name}</h3>
                                <p className={styles.adText}>
                                    Experience the best events with Lynk-X. This campaign is managed by {campaign.client}
                                    and runs from {campaign.startDate} to {campaign.endDate}.
                                </p>
                                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--color-brand-primary)' }}>
                                    Target Event: {campaign.targetEventId || 'No linked event'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        {campaign.status === 'draft' && (
                            <>
                                <button
                                    className={adminStyles.btnPrimary}
                                    onClick={() => onStatusChange?.(campaign.id, 'active')}
                                >
                                    Approve Campaign
                                </button>
                                <button
                                    className={adminStyles.btnSecondary}
                                    onClick={() => onStatusChange?.(campaign.id, 'rejected')}
                                >
                                    Reject
                                </button>
                            </>
                        )}
                        {campaign.status === 'active' && (
                            <button
                                className={adminStyles.btnSecondary}
                                onClick={() => onStatusChange?.(campaign.id, 'paused')}
                            >
                                Pause Campaign
                            </button>
                        )}
                        {campaign.status === 'paused' && (
                            <button
                                className={adminStyles.btnPrimary}
                                onClick={() => onStatusChange?.(campaign.id, 'active')}
                            >
                                Resume Campaign
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.previewColumn}>
                    <h2 className={styles.sectionTitle}>Live Preview</h2>
                    <div className={styles.mockDevice}>
                        <div className={styles.deviceContent}>
                            <div className={styles.adPreviewWrapper}>
                                {campaign.adType === 'interstitial' ? (
                                    <div className={styles.mockAdInterstitial}>
                                        <div className={styles.mockAdHeader}>
                                            <div style={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}>AD</div>
                                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Download in progress</div>
                                            <div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>05</div>
                                        </div>
                                        <div className={styles.mockAdMedia}>
                                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <polyline points="21 15 16 10 5 21" />
                                            </svg>
                                        </div>
                                        <div className={styles.mockAdInfo}>
                                            <span className={styles.mockAdBadge}>Ad • INTERSTITIAL</span>
                                            <div className={styles.mockAdTitle} style={{ fontSize: '20px' }}>{campaign.name}</div>
                                            <div className={styles.mockAdDesc} style={{ fontSize: '14px' }}>
                                                Join {campaign.client} for an exclusive experience. Click to learn more!
                                            </div>
                                            <button style={{
                                                marginTop: '20px', width: '100%', padding: '12px', background: 'var(--color-brand-primary)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 600, cursor: 'pointer'
                                            }}>
                                                Install/Open Now
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {campaign.adType === 'banner' && (
                                            <div className={styles.mockAdBanner}>
                                                <div className={styles.mockAdTitle} style={{ fontWeight: 800 }}>AD</div>
                                                <div className={styles.mockAdCTA}>Learn More</div>
                                            </div>
                                        )}

                                        <div className={styles.mockAppContent}>
                                            <div className={styles.mockAppLine} style={{ width: '40%' }}></div>
                                            <div className={styles.mockAppLine} style={{ width: '80%' }}></div>

                                            {campaign.adType === 'feed_card' && (
                                                <div className={styles.mockAd}>
                                                    <div className={styles.mockAdMedia}>
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5">
                                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                                            <polyline points="21 15 16 10 5 21" />
                                                        </svg>
                                                    </div>
                                                    <div className={styles.mockAdInfo}>
                                                        <div className={styles.mockAdTitle}>{campaign.name}</div>
                                                        <div className={styles.mockAdDesc}>{campaign.client}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {campaign.adType === 'map_pin' && (
                                                <div className={styles.mockMapPreview}>
                                                    <div className={styles.mapPin}>
                                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                                                    </div>
                                                    <div className={styles.mapPopup}>
                                                        <div className={styles.mockAdTitle} style={{ fontSize: '11px' }}>{campaign.name}</div>
                                                        <div className={styles.mockAdDesc} style={{ fontSize: '9px' }}>Tap to view details</div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className={styles.mockAppLine} style={{ width: '90%', marginTop: 'auto' }}></div>
                                            <div className={styles.mockAppLine} style={{ width: '100%' }}></div>
                                            <div className={styles.mockAppLine} style={{ width: '70%' }}></div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
