"use client";

import { useState } from 'react';
import styles from './page.module.css';
import adminStyles from '../../../page.module.css';
import Link from 'next/link';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';

interface AdAsset {
    id: string;
    type: 'image' | 'video' | 'text';
    url?: string;
    content?: string;
    status: 'pending' | 'approved' | 'rejected';
    dimensions?: string;
    fileSize?: string;
    addedAt: string;
}

const mockAssets: AdAsset[] = [
    { id: 'a1', type: 'image', url: '/placeholders/ad-banner-1.jpg', status: 'pending', dimensions: '1200x628', fileSize: '245 KB', addedAt: '2 hours ago' },
    { id: 'a2', type: 'video', url: '/placeholders/ad-video-1.mp4', status: 'pending', dimensions: '1080x1920', fileSize: '4.2 MB', addedAt: '2 hours ago' },
    { id: 'a3', type: 'text', content: 'Join the biggest summer festival in the valley! Get 20% off early bird tickets today.', status: 'approved', addedAt: '1 day ago' },
    { id: 'a4', type: 'image', url: '/placeholders/ad-square-1.jpg', status: 'rejected', dimensions: '1080x1080', fileSize: '800 KB', addedAt: '2 days ago' },
];

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'approved': return 'success';
        case 'rejected': return 'error';
        case 'pending': return 'warning';
        default: return 'neutral';
    }
};

export default function CampaignAssetsPage({ params }: { params: { id: string } }) {
    const { showToast } = useToast();
    const [assets, setAssets] = useState<AdAsset[]>(mockAssets); // Mutable for approving/rejecting

    const updateAssetStatus = (id: string, newStatus: 'approved' | 'rejected') => {
        setAssets(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
        showToast(`Asset marked as ${newStatus}.`, newStatus === 'approved' ? 'success' : 'error');
    };

    const handleApproveAll = () => {
        setAssets(prev => prev.map(a => a.status === 'pending' ? { ...a, status: 'approved' } : a));
        showToast('All pending assets approved.', 'success');
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
                        <Badge label={`Campaign ${params.id}`} variant="neutral" />
                    </div>
                    <h1 className={adminStyles.title}>Review Ad Assets</h1>
                    <p className={adminStyles.subtitle}>Approve or reject creative assets uploaded for this campaign.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className={adminStyles.btnPrimary} onClick={handleApproveAll}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Approve All Pending
                    </button>
                </div>
            </header>

            <div className={styles.gallery}>
                {assets.map((asset) => (
                    <div key={asset.id} className={styles.assetCard}>
                        {/* Preview Area */}
                        <div className={styles.previewContainer}>
                            {asset.type === 'image' && (
                                <div className={styles.imagePreview}>
                                    {/* Mock placeholder since actual URLs don't exist */}
                                    <div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)' }}>
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                    </div>
                                </div>
                            )}
                            {asset.type === 'video' && (
                                <div className={styles.videoPreview}>
                                    <div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)' }}>
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                    </div>
                                </div>
                            )}
                            {asset.type === 'text' && (
                                <div className={styles.textPreview}>
                                    <p>"{asset.content}"</p>
                                </div>
                            )}

                            <div className={styles.statusOverlay}>
                                <Badge label={asset.status.toUpperCase()} variant={getStatusVariant(asset.status)} />
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className={styles.metaContainer}>
                            <div className={styles.metaRow}>
                                <span className={styles.metaLabel}>Type</span>
                                <span className={styles.metaValue} style={{ textTransform: 'capitalize' }}>{asset.type}</span>
                            </div>
                            {asset.dimensions && (
                                <div className={styles.metaRow}>
                                    <span className={styles.metaLabel}>Dimensions</span>
                                    <span className={styles.metaValue}>{asset.dimensions}</span>
                                </div>
                            )}
                            {asset.fileSize && (
                                <div className={styles.metaRow}>
                                    <span className={styles.metaLabel}>File Size</span>
                                    <span className={styles.metaValue}>{asset.fileSize}</span>
                                </div>
                            )}
                            <div className={styles.metaRow}>
                                <span className={styles.metaLabel}>Added</span>
                                <span className={styles.metaValue}>{asset.addedAt}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className={styles.actionContainer}>
                            <button
                                className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                onClick={() => updateAssetStatus(asset.id, 'rejected')}
                                disabled={asset.status === 'rejected'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                Reject
                            </button>
                            <button
                                className={`${styles.actionBtn} ${styles.approveBtn}`}
                                onClick={() => updateAssetStatus(asset.id, 'approved')}
                                disabled={asset.status === 'approved'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Approve
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
