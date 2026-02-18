"use client";

import React, { useState } from 'react';
import styles from './CreateCampaignForm.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CreateCampaignForm() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        budget: '',
        startDate: '',
        endDate: '',
        adTitle: '',
        adText: '',
        targetUrl: '',
        imageUrl: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Here we would submit the data to the backend
        console.log('Submitting campaign:', formData);

        // Mock successful submission
        router.push('/dashboard/ads');
    };

    const steps = [
        { number: 1, label: 'Campaign Details' },
        { number: 2, label: 'Ad Creative' },
        { number: 3, label: 'Review & Launch' }
    ];

    return (
        <div className={styles.container}>
            {/* Stepper */}
            <div className={styles.stepper}>
                {steps.map((s) => (
                    <div key={s.number} className={`${styles.step} ${step === s.number ? styles.activeStep : ''} ${step > s.number ? styles.completedStep : ''}`}>
                        <div className={styles.stepNumber}>
                            {step > s.number ? '✓' : s.number}
                        </div>
                        <span className={styles.stepLabel}>{s.label}</span>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit}>
                {/* Step 1: Campaign Details */}
                {step === 1 && (
                    <div className={styles.formSection}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="name">Campaign Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                className={styles.input}
                                placeholder="e.g. Summer Festival Promo"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
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

                {/* Step 2: Ad Creative */}
                {step === 2 && (
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

                {/* Step 3: Review */}
                {step === 3 && (
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
                <div className={styles.actions}>
                    {step === 1 ? (
                        <Link href="/dashboard/ads" className={styles.btnSecondary} style={{ display: 'inline-block', textDecoration: 'none', lineHeight: '20px' }}>
                            Cancel
                        </Link>
                    ) : (
                        <button type="button" onClick={prevStep} className={`${styles.btn} ${styles.btnSecondary}`}>
                            Back
                        </button>
                    )}

                    {step < 3 ? (
                        <button type="button" onClick={nextStep} className={`${styles.btn} ${styles.btnPrimary}`}>
                            Next Step
                        </button>
                    ) : (
                        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                            Launch Campaign
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
