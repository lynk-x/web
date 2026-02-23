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
            <div className={styles.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 className={styles.sectionTitle}>Campaign Metrics</h2>
                    <Badge
                        label={formatString(campaign.status)}
                        variant={campaign.status === 'active' ? 'success' : campaign.status === 'pending' ? 'warning' : 'neutral'}
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
                <h2 className={styles.sectionTitle}>Ad Creative</h2>
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
                    </div>
                </div>
            </div>

            <div className={styles.actions}>
                {campaign.status === 'pending' && (
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
    );
}
