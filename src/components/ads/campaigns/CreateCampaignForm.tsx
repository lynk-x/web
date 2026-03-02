"use client";

import React, { useState, useEffect, useMemo } from 'react';
import styles from './CreateCampaignForm.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import { useToast } from '@/components/ui/Toast';

export interface CampaignData {
    id?: string;
    title: string;
    description: string;
    type: 'banner' | 'interstitial' | 'feed_card' | 'map_pin';
    total_budget: string;
    daily_limit: string;
    start_at: string;
    end_at: string;
    target_url: string;
    target_event_id?: string;
    target_country_code?: string;
    // Creative Asset info (maps to ad_assets table)
    adHeadline: string;
    adImageUrl?: string;
}

interface CreateCampaignFormProps {
    initialData?: CampaignData;
    isEditing?: boolean;
    redirectPath?: string;
    onDirtyChange?: (isDirty: boolean) => void;
}

export default function CreateCampaignForm({
    initialData,
    isEditing = false,
    redirectPath = '/dashboard/ads/campaigns',
    onDirtyChange
}: CreateCampaignFormProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [activeTab, setActiveTab] = useState('details');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const defaultData = initialData || {
        title: '',
        description: '',
        type: 'banner',
        total_budget: '',
        daily_limit: '',
        start_at: '',
        end_at: '',
        target_url: '',
        target_event_id: '',
        target_country_code: 'KE',
        adHeadline: '',
        adImageUrl: ''
    };
    const [formData, setFormData] = useState<CampaignData>(defaultData);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Dirty Check
    useEffect(() => {
        const isDirty = JSON.stringify(formData) !== JSON.stringify(defaultData);
        onDirtyChange?.(isDirty);

        if (isDirty) {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = '';
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, [formData, onDirtyChange]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (!touched[name]) {
            setTouched(prev => ({ ...prev, [name]: true }));
        }
    };

    const nextTab = (tab: string) => setActiveTab(tab);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAccount) {
            showToast('Please select an active account/organization first.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEditing && formData.id) {
                // Handle Update
                const { error } = await supabase
                    .from('ad_campaigns')
                    .update({
                        title: formData.title,
                        description: formData.description,
                        type: formData.type,
                        total_budget: parseFloat(formData.total_budget),
                        daily_limit: formData.daily_limit ? parseFloat(formData.daily_limit) : null,
                        start_at: new Date(formData.start_at).toISOString(),
                        end_at: new Date(formData.end_at).toISOString(),
                        target_url: formData.target_url,
                        target_event_id: formData.target_event_id || null,
                        target_country_code: formData.target_country_code,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', formData.id);

                if (error) throw error;

                // Update primary asset
                const { error: assetError } = await supabase
                    .from('ad_assets')
                    .update({
                        call_to_action: formData.adHeadline,
                        url: formData.adImageUrl,
                        type: formData.type,
                        updated_at: new Date().toISOString()
                    })
                    .eq('campaign_id', formData.id)
                    .eq('is_primary', true);

                if (assetError) console.error('Asset update error:', assetError);
                showToast('Campaign updated successfully!', 'success');
            } else {
                // Handle Create
                const { data: campaign, error } = await supabase
                    .from('ad_campaigns')
                    .insert({
                        account_id: activeAccount.id,
                        title: formData.title,
                        description: formData.description,
                        type: formData.type,
                        total_budget: parseFloat(formData.total_budget),
                        daily_limit: formData.daily_limit ? parseFloat(formData.daily_limit) : null,
                        start_at: new Date(formData.start_at).toISOString(),
                        end_at: new Date(formData.end_at).toISOString(),
                        target_url: formData.target_url,
                        target_event_id: formData.target_event_id || null,
                        target_country_code: formData.target_country_code,
                        status: 'draft'
                    })
                    .select()
                    .single();

                if (error) throw error;

                if (campaign) {
                    const { error: assetError } = await supabase
                        .from('ad_assets')
                        .insert({
                            campaign_id: campaign.id,
                            type: formData.type,
                            call_to_action: formData.adHeadline,
                            url: formData.adImageUrl,
                            is_primary: true
                        });

                    if (assetError) console.error('Asset creation error:', assetError);
                }
                showToast('Campaign launched as draft!', 'success');
            }

            onDirtyChange?.(false);
            router.push(redirectPath);
            router.refresh();
        } catch (error: any) {
            console.error('Submission error:', error);
            showToast(error.message || 'Failed to save campaign.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getInputClass = (name: string, baseClass: string) => {
        if (!touched[name]) return baseClass;
        const isValid = !!formData[name as keyof typeof formData];
        return `${baseClass} ${isValid ? 'input-success' : 'input-error'}`;
    };

    const renderValidationHint = (name: string) => {
        if (!touched[name]) return null;
        const isValid = !!formData[name as keyof typeof formData];
        return isValid ? (
            <div className="validation-hint success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Valid
            </div>
        ) : (
            <div className="validation-hint error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                Required
            </div>
        );
    };

    return (
        <div className={styles.layout}>
            <div className={styles.formColumn}>
                <div className={styles.container}>
                    {/* Tabs */}
                    <div className={styles.tabs}>
                        <div
                            className={`${styles.tabItem} ${activeTab === 'details' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('details')}
                        >
                            Campaign Details
                        </div>
                        <div
                            className={`${styles.tabItem} ${activeTab === 'creative' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('creative')}
                        >
                            Ad Creative
                        </div>
                        <div
                            className={`${styles.tabItem} ${activeTab === 'review' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('review')}
                        >
                            Review & Launch
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Tab: Campaign Details */}
                        {activeTab === 'details' && (
                            <div className={styles.formSection}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label} htmlFor="title">Campaign Title</label>
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        className={getInputClass('title', styles.input)}
                                        placeholder="e.g. Summer Festival Promo"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    {renderValidationHint('title')}
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label} htmlFor="description">Campaign Description</label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        className={styles.textarea}
                                        placeholder="Internal description or overview..."
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className={styles.row}>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label} htmlFor="type">Ad Type</label>
                                        <select
                                            id="type"
                                            name="type"
                                            className={styles.input}
                                            value={formData.type}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="banner">Banner Ad</option>
                                            <option value="interstitial">Interstitial</option>
                                            <option value="feed_card">Feed Card</option>
                                            <option value="map_pin">Map Pin</option>
                                        </select>
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label} htmlFor="target_country_code">Target Region</label>
                                        <select
                                            id="target_country_code"
                                            name="target_country_code"
                                            className={styles.input}
                                            value={formData.target_country_code}
                                            onChange={handleInputChange}
                                        >
                                            <option value="KE">Kenya</option>
                                            <option value="UG">Uganda</option>
                                            <option value="TZ">Tanzania</option>
                                            <option value="RW">Rwanda</option>
                                        </select>
                                    </div>
                                </div>

                                <div className={styles.row}>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label} htmlFor="total_budget">Total Budget ($)</label>
                                        <input
                                            type="number"
                                            id="total_budget"
                                            name="total_budget"
                                            className={styles.input}
                                            placeholder="1000"
                                            value={formData.total_budget}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label} htmlFor="daily_limit">Daily Limit ($)</label>
                                        <input
                                            type="number"
                                            id="daily_limit"
                                            name="daily_limit"
                                            className={styles.input}
                                            placeholder="50"
                                            value={formData.daily_limit}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <div className={styles.row}>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label} htmlFor="start_at">Start Date</label>
                                        <input
                                            type="date"
                                            id="start_at"
                                            name="start_at"
                                            className={styles.input}
                                            value={formData.start_at}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label} htmlFor="end_at">End Date</label>
                                        <input
                                            type="date"
                                            id="end_at"
                                            name="end_at"
                                            className={styles.input}
                                            value={formData.end_at}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab: Ad Creative */}
                        {activeTab === 'creative' && (
                            <div className={styles.formSection}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label} htmlFor="adHeadline">Ad Headline / Call to Action</label>
                                    <input
                                        type="text"
                                        id="adHeadline"
                                        name="adHeadline"
                                        className={styles.input}
                                        placeholder="e.g. Get 20% Off Tickets Today!"
                                        value={formData.adHeadline}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label} htmlFor="target_url">Destination URL</label>
                                    <input
                                        type="url"
                                        id="target_url"
                                        name="target_url"
                                        className={styles.input}
                                        placeholder="https://lynk-x.com/event/..."
                                        value={formData.target_url}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label} htmlFor="adImageUrl">Image URL (Optional)</label>
                                    <input
                                        type="url"
                                        id="adImageUrl"
                                        name="adImageUrl"
                                        className={styles.input}
                                        placeholder="https://..."
                                        value={formData.adImageUrl}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Tab: Review */}
                        {activeTab === 'review' && (
                            <div className={styles.formSection}>
                                <h3>Review Campaign</h3>
                                <div className={styles.previewCard}>
                                    <div className={styles.reviewItem}>
                                        <span className={styles.reviewLabel}>Campaign Title</span>
                                        <span className={styles.reviewValue}>{formData.title}</span>
                                    </div>
                                    <div className={styles.reviewItem}>
                                        <span className={styles.reviewLabel}>Budget</span>
                                        <span className={styles.reviewValue}>${formData.total_budget} (Limit: ${formData.daily_limit}/day)</span>
                                    </div>
                                    <div className={styles.reviewItem}>
                                        <span className={styles.reviewLabel}>Duration</span>
                                        <span className={styles.reviewValue}>{formData.start_at} to {formData.end_at}</span>
                                    </div>
                                    <div className={styles.reviewItem}>
                                        <span className={styles.reviewLabel}>Headline</span>
                                        <span className={styles.reviewValue}>{formData.adHeadline}</span>
                                    </div>
                                    <div className={styles.reviewItem}>
                                        <span className={styles.reviewLabel}>Target URL</span>
                                        <span className={styles.reviewValue}>{formData.target_url}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className={styles.actions}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {(activeTab === 'creative' || activeTab === 'review') && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab(activeTab === 'creative' ? 'details' : 'creative')}
                                        className={`${styles.btn} ${styles.btnSecondary}`}
                                    >
                                        Back
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                {activeTab === 'details' && (
                                    <button type="button" onClick={() => nextTab('creative')} className={`${styles.btn} ${styles.btnPrimary}`}>
                                        Next: Ad Creative
                                    </button>
                                )}
                                {activeTab === 'creative' && (
                                    <button type="button" onClick={() => nextTab('review')} className={`${styles.btn} ${styles.btnPrimary}`}>
                                        Next: Review
                                    </button>
                                )}
                                {activeTab === 'review' && (
                                    <button type="submit" disabled={isSubmitting} className={`${styles.btn} ${styles.btnPrimary}`}>
                                        {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Launch Campaign')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <div className={styles.previewColumn}>
                <h2 className={styles.previewTitle}>Live Preview</h2>
                <div className={styles.mockDevice}>
                    <div className={styles.deviceContent}>
                        <div className={styles.adPreviewWrapper}>
                            {formData.type === 'interstitial' ? (
                                <div className={styles.mockAdInterstitial}>
                                    <div className={styles.mockAdHeader}>
                                        <div style={{ color: '#fff', fontSize: '10px', fontWeight: 800 }}>AD</div>
                                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>Download in progress</div>
                                        <div style={{ color: '#fff', fontSize: '10px', fontWeight: 600 }}>05</div>
                                    </div>
                                    <div className={styles.mockAdMedia}>
                                        {formData.adImageUrl ? (
                                            <img src={formData.adImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                        <div className={styles.mockAdTitle} style={{ fontSize: '18px' }}>{formData.adHeadline || 'Your Catchy Headline'}</div>
                                        <div className={styles.mockAdDesc}>{formData.title || 'Campaign Name'}</div>
                                        <button style={{
                                            marginTop: '16px', width: '100%', padding: '10px', background: 'var(--color-brand-primary)', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 600, fontSize: '13px'
                                        }}>
                                            Learn More
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {formData.type === 'banner' && (
                                        <div className={styles.mockAdBanner}>
                                            <div className={styles.mockAdTitle} style={{ fontWeight: 800 }}>AD</div>
                                            <div className={styles.mockAdCTA}>Learn More</div>
                                        </div>
                                    )}

                                    <div className={styles.mockAppContent}>
                                        <div className={styles.mockAppLine} style={{ width: '40%' }}></div>
                                        <div className={styles.mockAppLine} style={{ width: '80%' }}></div>

                                        {formData.type === 'feed_card' && (
                                            <div className={styles.mockAd}>
                                                <div className={styles.mockAdMedia}>
                                                    {formData.adImageUrl ? (
                                                        <img src={formData.adImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5">
                                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                                            <polyline points="21 15 16 10 5 21" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className={styles.mockAdInfo}>
                                                    <div className={styles.mockAdTitle}>{formData.adHeadline || 'Ad Headline'}</div>
                                                    <div className={styles.mockAdDesc}>{formData.title || 'Campaign Title'}</div>
                                                </div>
                                            </div>
                                        )}

                                        {formData.type === 'map_pin' && (
                                            <div className={styles.mockMapPreview}>
                                                <div className={styles.mapPin}>
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                                                </div>
                                                <div className={styles.mapPopup}>
                                                    <div className={styles.mockAdTitle} style={{ fontSize: '10px' }}>{formData.adHeadline || 'Location Ad'}</div>
                                                    <div className={styles.mockAdDesc} style={{ fontSize: '8px' }}>Tap to view details</div>
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
    );
}
