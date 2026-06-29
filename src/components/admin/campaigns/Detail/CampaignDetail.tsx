"use client";

import React from 'react';
import styles from './CampaignDetail.module.css';
import { Campaign } from '@/types/admin';
import Badge from '../../../shared/Badge';
import { formatCurrency, formatNumber, formatString } from '@/utils/format';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import StatCard from '@/components/dashboard/StatCard';

interface CampaignDetailProps {
    campaign: Campaign;
    onStatusChange?: (id: string, newStatus: string) => void;
}

export default function CampaignDetail({ campaign, onStatusChange }: CampaignDetailProps) {
    const start = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);
    const now = new Date();
    
    // Total duration in ms
    const totalDuration = end.getTime() - start.getTime();
    // Time elapsed in ms
    const elapsed = now.getTime() - start.getTime();
    
    let percentTime = 0;
    if (totalDuration > 0) {
        percentTime = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    }
    
    // Remaining days
    const msInDay = 1000 * 60 * 60 * 24;
    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / msInDay);
    const totalDays = Math.ceil(totalDuration / msInDay);

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
                            <StatCard label="Total Budget" value={formatCurrency(campaign.budget)} />
                            <StatCard label="Actual Spend" value={formatCurrency(campaign.spend)} />
                            <StatCard label="Impressions" value={formatNumber(campaign.impressions)} />
                            <StatCard label="Total Clicks" value={formatNumber(campaign.clicks)} />
                            <StatCard
                                label="CTR"
                                value={
                                    campaign.impressions > 0
                                        ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) + '%'
                                        : '0.00%'
                                }
                            />
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Campaign Timeline</h2>
                        <div className={styles.timelineCard}>
                            <div className={styles.timelineHeader}>
                                <span className={styles.timelineStatus}>
                                    {now < start ? (
                                        `Starts in ${Math.ceil((start.getTime() - now.getTime()) / msInDay)} days`
                                    ) : now > end ? (
                                        'Completed'
                                    ) : (
                                        `Active — Day ${Math.max(1, Math.floor(elapsed / msInDay))} of ${totalDays}`
                                    )}
                                </span>
                                <span className={styles.timelineDates}>
                                    {campaign.startDate} – {campaign.endDate}
                                </span>
                            </div>
                            <div className={styles.progressBarBg}>
                                <div className={styles.progressBarFill} style={{ width: `${percentTime}%` }}></div>
                            </div>
                            <div className={styles.timelineFooter}>
                                <span>{totalDays} days total</span>
                                <span>
                                    {now < start ? (
                                        'Scheduled'
                                    ) : now > end ? (
                                        '0 days remaining'
                                    ) : (
                                        `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Campaign Summary</h2>
                        <div className={styles.summaryCard}>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Campaign Title</span>
                                <div className={styles.summaryValue}>{campaign.name}</div>
                            </div>
                            
                            {campaign.description && (
                                <div className={styles.summaryRow}>
                                    <span className={styles.summaryLabel}>Description</span>
                                    <div className={styles.summaryValue} style={{ opacity: 0.8, lineHeight: 1.5 }}>
                                        {campaign.description}
                                    </div>
                                </div>
                            )}

                            <div className={styles.summaryGrid}>
                                <div className={styles.summaryRow}>
                                    <span className={styles.summaryLabel}>Ad Type</span>
                                    <div style={{ marginTop: '4px' }}>
                                        {campaign.adType ? (
                                            <Badge
                                                label={campaign.adType.toUpperCase().replace(/_/g, ' ')}
                                                variant={campaign.adType === 'banner' ? 'neutral' : 'info'}
                                            />
                                        ) : (
                                            <span style={{ opacity: 0.5 }}>—</span>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.summaryRow}>
                                    <span className={styles.summaryLabel}>Destination URL</span>
                                    <div className={styles.summaryValue} style={{ wordBreak: 'break-all' }}>
                                        {campaign.destinationUrl ? (
                                            <a
                                                href={campaign.destinationUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: 'var(--color-brand-primary)', textDecoration: 'none', fontWeight: 500 }}
                                            >
                                                {campaign.destinationUrl}
                                            </a>
                                        ) : (
                                            <span style={{ opacity: 0.5 }}>No destination URL</span>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.summaryRow}>
                                    <span className={styles.summaryLabel}>Target Regions</span>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                        {campaign.targetCountries && campaign.targetCountries.length > 0 ? (
                                            campaign.targetCountries.map(country => (
                                                <Badge key={country} label={country} variant="primary" />
                                            ))
                                        ) : (
                                            <span style={{ opacity: 0.5, fontSize: '13px' }}>All Regions</span>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.summaryRow}>
                                    <span className={styles.summaryLabel}>Target Tags</span>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                        {campaign.targetTags && campaign.targetTags.length > 0 ? (
                                            campaign.targetTags.map(tag => (
                                                <Badge key={tag} label={tag} variant="info" />
                                            ))
                                        ) : (
                                            <span style={{ opacity: 0.5, fontSize: '13px' }}>No target tags</span>
                                        )}
                                    </div>
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
                                {campaign.adType === 'interstitial' || campaign.adType === 'interstitial_video' ? (
                                    <div className={styles.mockAdInterstitial}>
                                        <div className={styles.mockAdHeader}>
                                            <div style={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}>AD</div>
                                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                                                {campaign.mediaType === 'video' ? 'Video playing' : 'Sponsor Ad'}
                                            </div>
                                            <div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>05</div>
                                        </div>
                                        <div className={styles.mockAdMedia}>
                                            {campaign.mediaUrl ? (
                                                campaign.mediaType === 'video' ? (
                                                    <video
                                                        src={campaign.mediaUrl}
                                                        autoPlay
                                                        muted
                                                        loop
                                                        playsInline
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <img
                                                        src={campaign.mediaUrl}
                                                        alt={campaign.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                )
                                            ) : (
                                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                                    <polyline points="21 15 16 10 5 21" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className={styles.mockAdInfo}>
                                            <span className={styles.mockAdBadge}>Ad • INTERSTITIAL</span>
                                            <div className={styles.mockAdTitle} style={{ fontSize: '20px' }}>{campaign.name}</div>
                                            <div className={styles.mockAdDesc} style={{ fontSize: '14px' }}>
                                                {campaign.description || `Join ${campaign.client} for an exclusive experience. Click to learn more!`}
                                            </div>
                                            <button style={{
                                                marginTop: '20px', width: '100%', padding: '12px', background: 'var(--color-brand-primary)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 600, cursor: 'pointer'
                                            }}>
                                                {campaign.callToAction || 'Learn More'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {campaign.adType === 'banner' && (
                                            <div
                                                className={styles.mockAdBanner}
                                                style={campaign.mediaUrl ? {
                                                    backgroundImage: `url(${campaign.mediaUrl})`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center',
                                                    justifyContent: 'flex-end',
                                                    paddingRight: '12px'
                                                } : {}}
                                            >
                                                {!campaign.mediaUrl && <div className={styles.mockAdTitle} style={{ fontWeight: 800 }}>AD</div>}
                                                <div className={styles.mockAdCTA}>
                                                    {campaign.callToAction || 'Learn More'}
                                                </div>
                                            </div>
                                        )}

                                        <div className={styles.mockAppContent}>
                                            <div className={styles.mockAppLine} style={{ width: '40%' }}></div>
                                            <div className={styles.mockAppLine} style={{ width: '80%' }}></div>

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
