"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './SystemConfigForm.module.css';
import adminStyles from '@/app/dashboard/admin/page.module.css';
import { useToast } from '@/components/ui/Toast';

interface SystemConfigFormProps {
    initialData?: {
        key: string;
        description: string;
        value: string;
        status: 'active' | 'inactive';
    };
    isEditMode?: boolean;
}

export default function SystemConfigForm({ initialData, isEditMode = false }: SystemConfigFormProps) {
    const router = useRouter();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        key: initialData?.key || '',
        description: initialData?.description || '',
        value: initialData?.value || '',
        status: initialData?.status || 'active',
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // Simulate API call
        setTimeout(() => {
            showToast(isEditMode ? 'Configuration updated.' : 'Configuration created.', 'success');
            router.push('/dashboard/admin/system-configs');
        }, 800);
    };

    return (
        <form className={styles.formContainer} onSubmit={handleSubmit}>
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>{isEditMode ? 'Edit Configuration' : 'New Configuration'}</h2>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Configuration Key</label>
                    <input
                        type="text"
                        name="key"
                        className={styles.input}
                        value={formData.key}
                        onChange={handleChange}
                        placeholder="e.g. MAX_UPLOAD_SIZE"
                        required
                        disabled={isEditMode}
                    />
                    <p className={styles.helpText}>Uppercase with underscores. Cannot be changed after creation.</p>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Description</label>
                    <textarea
                        name="description"
                        className={styles.textarea}
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="What does this configuration control?"
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Value</label>
                    <input
                        type="text"
                        name="value"
                        className={styles.input}
                        value={formData.value}
                        onChange={handleChange}
                        placeholder="Enter value"
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Status</label>
                    <select
                        name="status"
                        className={styles.select}
                        value={formData.status}
                        onChange={handleChange}
                    >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            <div className={styles.actions}>
                <button
                    type="submit"
                    className={adminStyles.btnPrimary}
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </form>
    );
}
