"use client";

import { useState, useEffect, useMemo } from 'react';
import styles from './page.module.css';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';

export default function AdsSettingsPage() {
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        support_email: '',
        business_name: '',
        tax_id: '',
        address: ''
    });

    useEffect(() => {
        if (activeAccount) {
            setFormData({
                name: activeAccount.name || '',
                support_email: (activeAccount as any).support_email || '',
                business_name: (activeAccount as any).business_name || '',
                tax_id: (activeAccount as any).tax_id || '',
                address: (activeAccount as any).business_address || ''
            });
        }
    }, [activeAccount]);

    const handleSave = async () => {
        if (!activeAccount) return;
        setIsSaving(true);
        showToast('Saving settings...', 'info');

        try {
            const { error } = await supabase
                .from('accounts')
                .update({
                    name: formData.name,
                    support_email: formData.support_email,
                    business_name: formData.business_name,
                    tax_id: formData.tax_id,
                    business_address: formData.address
                })
                .eq('id', activeAccount.id);

            if (error) throw error;
            showToast('Settings saved successfully.', 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to save settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Ads Settings</h1>
                    <p className={styles.subtitle}>Manage your advertising account preferences and business information.</p>
                </div>
                <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </header>

            <div className={styles.grid}>
                {/* Account Settings */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Account Information</h2>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Account Name</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Contact Email</label>
                        <input
                            type="email"
                            className={styles.input}
                            value={formData.support_email}
                            onChange={e => setFormData({ ...formData, support_email: e.target.value })}
                        />
                    </div>
                </section>

                {/* Business Details */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Business Details</h2>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Legal Business Name</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={formData.business_name}
                            onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Tax ID / PIN</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={formData.tax_id}
                            onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Business Address</label>
                        <textarea
                            className={styles.textarea}
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>
                </section>

                {/* Danger Zone */}
                <section className={`${styles.section} ${styles.dangerZone}`}>
                    <h2 className={styles.sectionTitle}>Danger Zone</h2>
                    <p className={styles.dangerText}>Once you deactivate your ads account, all active campaigns will be paused indefinitely. This action cannot be undone from the dashboard.</p>
                    <button className={styles.dangerBtn} onClick={() => showToast('Deactivation requires support contact.', 'error')}>
                        Deactivate Ads Account
                    </button>
                </section>
            </div>
        </div>
    );
}
