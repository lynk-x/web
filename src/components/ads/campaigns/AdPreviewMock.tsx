"use client";

import React from 'react';
import styles from './AdPreviewMock.module.css';

interface AdPreviewMockProps {
    /** From advertising.ad_type: 'banner' | 'interstitial' | 'interstitial_video'. */
    type: string;
    /** Campaign title, shown as the interstitial's secondary line. */
    title: string;
    /** The creative's call-to-action / headline text. */
    headline?: string;
    /** The creative's image or video URL. */
    mediaUrl?: string | null;
    mediaType?: 'image' | 'video' | string;
}

/**
 * Read-only phone-frame mockup of how a campaign's primary creative renders
 * in the Lynk-X app — the same visual built for CreateCampaignForm's live
 * "Live Preview" panel, extracted here so the campaign detail page can show
 * the same mockup for an already-saved campaign instead of live form state.
 */
export default function AdPreviewMock({ type, title, headline, mediaUrl, mediaType }: AdPreviewMockProps) {
    const isInterstitial = type === 'interstitial' || type === 'interstitial_video';
    const isVideo = type === 'interstitial_video' || mediaType === 'video';

    return (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <div className={styles.mockDevice}>
                <div className={styles.deviceContent}>
                    <div className={styles.adPreviewWrapper}>
                        {isInterstitial ? (
                            <div className={styles.mockAdInterstitial}>
                                <div className={styles.mockAdHeader}>
                                    <div style={{ color: '#fff', fontSize: '10px', fontWeight: 800 }}>AD</div>
                                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>Download in progress</div>
                                    <div style={{ color: '#fff', fontSize: '10px', fontWeight: 600 }}>05</div>
                                </div>
                                <div className={styles.mockAdMedia}>
                                    {mediaUrl ? (
                                        isVideo ? (
                                            <video src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted loop />
                                        ) : (
                                            <img src={mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        )
                                    ) : isVideo ? (
                                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5">
                                            <polygon points="5 3 19 12 5 21 5 3" />
                                        </svg>
                                    ) : (
                                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1">
                                            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                                        </svg>
                                    )}
                                </div>
                                <div className={styles.mockAdInfo}>
                                    <span className={styles.mockAdBadge}>Ad • {type === 'interstitial_video' ? 'VIDEO' : 'INTERSTITIAL'}</span>
                                    <div className={styles.mockAdTitle} style={{ fontSize: '18px' }}>{headline || 'Your Catchy Headline'}</div>
                                    <div className={styles.mockAdDesc}>{title || 'Campaign Name'}</div>
                                    <div style={{
                                        marginTop: '16px', width: '100%', padding: '10px', textAlign: 'center',
                                        background: 'var(--color-brand-primary)',
                                        border: 'none', borderRadius: '6px', color: '#000', fontWeight: 600, fontSize: '13px',
                                    }}>
                                        Learn More
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {type === 'banner' && (
                                    <div className={styles.mockAdBanner}>
                                        {mediaUrl ? (
                                            <img src={mediaUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', opacity: 0.5 }} />
                                        ) : null}
                                        <div className={styles.mockAdTitle} style={{ fontWeight: 800, zIndex: 1, position: 'relative' }}>
                                            {headline || 'AD'}
                                        </div>
                                        <div className={styles.mockAdCTA} style={{ zIndex: 1, position: 'relative', color: '#fff' }}>
                                            Learn More
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
    );
}
