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
}

export default function AudienceForm({ initialData, isEditing = false }: AudienceFormProps) {
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Mock submission
        console.log(isEditing ? 'Updating audience:' : 'Creating audience:', formData);
        router.push('/dashboard/ads/audiences');
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
                            className={styles.input}
                            placeholder="e.g. Music Lovers - NYC"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className={styles.row}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="category">Category</label>
                            <select
                                id="category"
                                name="category"
                                className={styles.select}
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
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="tags">Tags (comma separated)</label>
                            <input
                                type="text"
                                id="tags"
                                name="tags"
                                className={styles.input}
                                placeholder="e.g. jazz, nft, coding"
                                value={formData.tags}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    <div className={styles.locationSection}>
                        <label className={styles.label}>Location Targeting</label>
                        <div className={styles.locationGrid}>
                            <div className={styles.inputGroup}>
                                <input
                                    type="text"
                                    name="country"
                                    className={styles.input}
                                    placeholder="Country"
                                    value={formData.country}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <input
                                    type="text"
                                    name="city"
                                    className={styles.input}
                                    placeholder="City"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className={styles.inputGroup} style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    name="radius"
                                    className={styles.input}
                                    placeholder="Radius"
                                    value={formData.radius}
                                    onChange={handleInputChange}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '12px', pointerEvents: 'none' }}>km</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="details">Audience Details</label>
                        <textarea
                            id="details"
                            name="details"
                            className={styles.textarea}
                            placeholder="Describe any additional targeting criteria..."
                            value={formData.details}
                            onChange={handleInputChange}
                            required
                        />
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
                    <button type="button" onClick={() => router.back()} className={`${styles.btn} ${styles.btnSecondary}`}>
                        Cancel
                    </button>
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                        {isEditing ? 'Save Changes' : 'Create Audience'}
                    </button>
                </div>
            </form>
        </div>
    );
}
