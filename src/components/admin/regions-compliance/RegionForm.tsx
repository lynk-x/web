"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './RegionForm.module.css';
import adminStyles from '@/app/dashboard/admin/page.module.css';
import { useToast } from '@/components/ui/Toast';

interface RegionFormProps {
    initialData?: {
        name: string;
        code: string;
        currency: string;
        platformFee: string;
        taxConfig: string;
        status: 'active' | 'restricted' | 'banned';
    };
    isEditMode?: boolean;
}

export default function RegionForm({ initialData, isEditMode = false }: RegionFormProps) {
    const router = useRouter();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        code: initialData?.code || '',
        currency: initialData?.currency || '',
        platformFee: initialData?.platformFee || '',
        taxConfig: initialData?.taxConfig || '',
        status: initialData?.status || 'active',
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // Simulate API call
        setTimeout(() => {
            showToast(isEditMode ? 'Region updated.' : 'Region created.', 'success');
            router.push('/dashboard/admin/regions-compliance');
        }, 800);
    };

    return (
        <form className={styles.formContainer} onSubmit={handleSubmit}>
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>{isEditMode ? 'Edit Region' : 'New Region Details'}</h2>

                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Region Name</label>
                        <input
                            type="text"
                            name="name"
                            className={styles.input}
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. United States"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Country Code (ISO)</label>
                        <input
                            type="text"
                            name="code"
                            className={styles.input}
                            value={formData.code}
                            onChange={handleChange}
                            placeholder="e.g. US"
                            maxLength={2}
                            required
                            disabled={isEditMode}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Native Currency</label>
                        <select
                            name="currency"
                            className={styles.select}
                            value={formData.currency}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Currency</option>
                            <option value="USD">USD ($)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="CAD">CAD ($)</option>
                            <option value="AUD">AUD ($)</option>
                            <option value="NGN">NGN (₦)</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Platform Fee (%)</label>
                        <input
                            type="text"
                            name="platformFee"
                            className={styles.input}
                            value={formData.platformFee}
                            onChange={handleChange}
                            placeholder="e.g. 5.0%"
                            required
                        />
                        <p className={styles.helpText}>Default rate applied to organizers in this region.</p>
                    </div>

                    <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                        <label className={styles.label}>Tax Configuration</label>
                        <input
                            type="text"
                            name="taxConfig"
                            className={styles.input}
                            value={formData.taxConfig}
                            onChange={handleChange}
                            placeholder="e.g. State/Local (Dynamic) or VAT 20%"
                            required
                        />
                    </div>

                    <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                        <label className={styles.label}>Region Status</label>
                        <select
                            name="status"
                            className={styles.select}
                            value={formData.status}
                            onChange={handleChange}
                        >
                            <option value="active">Active (Full Service)</option>
                            <option value="restricted">Restricted (Limited Features)</option>
                            <option value="banned">Banned (No Service)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className={styles.actions}>
                <button
                    type="submit"
                    className={adminStyles.btnPrimary}
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Region'}
                </button>
            </div>
        </form>
    );
}
