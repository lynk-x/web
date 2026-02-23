"use client";

import React, { useState, useEffect } from 'react';
import styles from './CreateCampaignForm.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface CampaignData {
    id?: string;
    name: string;
    budget: string;
    startDate: string;
    endDate: string;
    adTitle: string;
    adText: string;
    targetUrl: string;
    imageUrl?: string;
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
    const [activeTab, setActiveTab] = useState('details');
    const defaultData = initialData || {
        name: '',
        budget: '',
        startDate: '',
        endDate: '',
        adTitle: '',
        adText: '',
        targetUrl: '',
        imageUrl: ''
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
        // Here we would submit the data to the backend
        console.log(isEditing ? 'Updating campaign:' : 'Launching campaign:', formData);

        onDirtyChange?.(false);
        // Mock successful submission
        router.push(redirectPath);
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
                            <label className={styles.label} htmlFor="name">Campaign Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                className={getInputClass('name', styles.input)}
                                placeholder="e.g. Summer Festival Promo"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                            {renderValidationHint('name')}
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="budget">Total Budget ($)</label>
                            <input
                                type="number"
                                id="budget"
                                name="budget"
                                className={styles.input}
                                placeholder="1000"
                                value={formData.budget}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className={styles.row}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="startDate">Start Date</label>
                                <input
                                    type="date"
                                    id="startDate"
                                    name="startDate"
                                    className={styles.input}
                                    value={formData.startDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="endDate">End Date</label>
                                <input
                                    type="date"
                                    id="endDate"
                                    name="endDate"
                                    className={styles.input}
                                    value={formData.endDate}
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
                            <label className={styles.label} htmlFor="adTitle">Ad Headline</label>
                            <input
                                type="text"
                                id="adTitle"
                                name="adTitle"
                                className={styles.input}
                                placeholder="e.g. Get 20% Off Tickets Today!"
                                value={formData.adTitle}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="adText">Ad Description</label>
                            <textarea
                                id="adText"
                                name="adText"
                                className={styles.textarea}
                                placeholder="Describe your offer..."
                                value={formData.adText}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="targetUrl">Destination URL</label>
                            <input
                                type="url"
                                id="targetUrl"
                                name="targetUrl"
                                className={styles.input}
                                placeholder="https://lynk-x.com/event/..."
                                value={formData.targetUrl}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="imageUrl">Image URL (Optional)</label>
                            <input
                                type="url"
                                id="imageUrl"
                                name="imageUrl"
                                className={styles.input}
                                placeholder="https://..."
                                value={formData.imageUrl}
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
                                <span className={styles.reviewLabel}>Campaign Name</span>
                                <span className={styles.reviewValue}>{formData.name}</span>
                            </div>
                            <div className={styles.reviewItem}>
                                <span className={styles.reviewLabel}>Budget</span>
                                <span className={styles.reviewValue}>${formData.budget}</span>
                            </div>
                            <div className={styles.reviewItem}>
                                <span className={styles.reviewLabel}>Duration</span>
                                <span className={styles.reviewValue}>{formData.startDate} to {formData.endDate}</span>
                            </div>
                            <div className={styles.reviewItem}>
                                <span className={styles.reviewLabel}>Headline</span>
                                <span className={styles.reviewValue}>{formData.adTitle}</span>
                            </div>
                            <div className={styles.reviewItem}>
                                <span className={styles.reviewLabel}>Target URL</span>
                                <span className={styles.reviewValue}>{formData.targetUrl}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '12px', flexDirection: 'row-reverse' }}>
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
                            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                                Launch Campaign
                            </button>
                        )}

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
                </div>
            </form>
        </div >
    );
}
