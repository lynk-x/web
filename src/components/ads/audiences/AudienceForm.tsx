"use client";

import React, { useState, useEffect } from 'react';
import styles from './AudienceForm.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface AudienceData {
    id?: string;
    name: string;
    category: string;
    tags: string;
    details: string;
    size?: string;
    country: string;
    city: string;
    radius: string;
}

interface AudienceFormProps {
    initialData?: AudienceData;
    isEditing?: boolean;
    onDirtyChange?: (isDirty: boolean) => void;
}

export default function AudienceForm({ initialData, isEditing = false, onDirtyChange }: AudienceFormProps) {
    const router = useRouter();
    const [formData, setFormData] = useState<AudienceData>(initialData || {
        name: '',
        category: 'Entertainment',
        tags: '',
        details: '',
        country: 'United States',
        city: '',
        radius: '25'
    });
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Dirty Check
    useEffect(() => {
        const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData || {
            name: '',
            category: 'Entertainment',
            tags: '',
            details: '',
            country: 'United States',
            city: '',
            radius: '25'
        });
        onDirtyChange?.(isDirty);

        if (isDirty) {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = '';
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, [formData, initialData, onDirtyChange]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Mock submission
        console.log(isEditing ? 'Updating audience:' : 'Creating audience:', formData);
        onDirtyChange?.(false); // Reset dirty state before navigation
        router.push('/dashboard/ads/audiences');
    };

    const getInputClass = (name: keyof AudienceData, baseClass: string) => {
        if (!touched[name as string]) return baseClass;
        return `${baseClass} ${formData[name] ? 'input-success' : 'input-error'}`;
    };

    const renderValidationHint = (name: keyof AudienceData) => {
        if (!touched[name as string]) return null;
        return formData[name] ? (
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
            <form onSubmit={handleSubmit}>
                <div className={styles.formSection}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="name">Audience Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            className={getInputClass('name', styles.input)}
                            placeholder="e.g. Music Lovers - NYC"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                        />
                        {renderValidationHint('name')}
                    </div>

                    <div className={styles.row}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="category">Category</label>
                            <select
                                id="category"
                                name="category"
                                className={getInputClass('category', styles.select)}
                                value={formData.category}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="Entertainment">Entertainment</option>
                                <option value="Technology">Technology</option>
                                <option value="Lifestyle">Lifestyle</option>
                                <option value="Education">Education</option>
                                <option value="Business">Business</option>
                            </select>
                            {renderValidationHint('category')}
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="tags">Tags (comma separated)</label>
                            <input
                                type="text"
                                id="tags"
                                name="tags"
                                className={getInputClass('tags', styles.input)}
                                placeholder="e.g. jazz, nft, coding"
                                value={formData.tags}
                                onChange={handleInputChange}
                            />
                            {renderValidationHint('tags')}
                        </div>
                    </div>

                    <div className={styles.locationSection}>
                        <label className={styles.label}>Location Targeting</label>
                        <div className={styles.locationGrid}>
                            <div className={styles.inputGroup}>
                                <input
                                    type="text"
                                    name="country"
                                    className={getInputClass('country', styles.input)}
                                    placeholder="Country"
                                    value={formData.country}
                                    onChange={handleInputChange}
                                    required
                                />
                                {renderValidationHint('country')}
                            </div>
                            <div className={styles.inputGroup}>
                                <input
                                    type="text"
                                    name="city"
                                    className={getInputClass('city', styles.input)}
                                    placeholder="City"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                />
                                {renderValidationHint('city')}
                            </div>
                            <div className={styles.inputGroup} style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    name="radius"
                                    className={getInputClass('radius', styles.input)}
                                    placeholder="Radius"
                                    value={formData.radius}
                                    onChange={handleInputChange}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '12px', pointerEvents: 'none' }}>km</span>
                                {renderValidationHint('radius')}
                            </div>
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="details">Audience Details</label>
                        <textarea
                            id="details"
                            name="details"
                            className={getInputClass('details', styles.textarea)}
                            placeholder="Describe any additional targeting criteria..."
                            value={formData.details}
                            onChange={handleInputChange}
                            required
                        />
                        {renderValidationHint('details')}
                    </div>

                    <div className={styles.estimateCard}>
                        <div className={styles.estimateTitle}>Potential Reach</div>
                        <div className={styles.estimateValue}>
                            {formData.name.length > 5 ? '1.2M - 1.5M' : '0'}
                        </div>
                        <div className={styles.estimateSub}>Estimated people who match your criteria</div>
                    </div>
                </div>

                <div className={styles.actions}>
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                        {isEditing ? 'Save Changes' : 'Create Audience'}
                    </button>
                </div>
            </form>
        </div>
    );
}
