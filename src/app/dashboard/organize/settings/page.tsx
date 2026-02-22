"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';

export default function OrganizerSettingsPage() {
    const { showToast } = useToast();
    const { activeAccount, refreshAccounts } = useOrganization();
    const supabase = createClient();

    // Form State
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        website: '',
        description: '',
        support_email: '',
        phone_number: ''
    });

    // Load active account data into form
    useEffect(() => {
        if (activeAccount) {
            setFormData({
                name: activeAccount.name || '',
                website: activeAccount.website || '',
                description: activeAccount.description || '',
                support_email: activeAccount.support_email || '',
                phone_number: activeAccount.phone_number || ''
            });
        }
    }, [activeAccount]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!activeAccount) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('accounts')
                .update({
                    name: formData.name,
                    website: formData.website,
                    description: formData.description,
                    support_email: formData.support_email,
                    phone_number: formData.phone_number
                })
                .eq('id', activeAccount.id);

            if (error) throw error;

            showToast('Organizer settings updated successfully.', 'success');
            if (refreshAccounts) await refreshAccounts(); // Update the global context

        } catch (error: any) {
            console.error("Error updating settings:", error);
            showToast(error.message || 'Failed to update settings.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Organizer Settings</h1>
                    <p className={styles.subtitle}>Configure your organization profile and application preferences.</p>
                </div>
                <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 3 7 8 15 8"></polyline>
                    </svg>
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </header>

            <div className={styles.grid}>
                {/* Organization Profile */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Organization Profile</h2>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Organization Name</label>
                        <input type="text" name="name" className={styles.input} value={formData.name} onChange={handleInputChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Website URL</label>
                        <input type="text" name="website" className={styles.input} value={formData.website} onChange={handleInputChange} placeholder="https://" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Organization Bio</label>
                        <textarea name="description" className={styles.textarea} value={formData.description} onChange={handleInputChange} placeholder="Tell attendees about your organization..." />
                    </div>
                </section>

                {/* Contact Information */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Support Contact</h2>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Support Email</label>
                        <input type="email" name="support_email" className={styles.input} value={formData.support_email} onChange={handleInputChange} placeholder="support@domain.com" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Support Phone</label>
                        <input type="text" name="phone_number" className={styles.input} value={formData.phone_number} onChange={handleInputChange} placeholder="+254..." />
                    </div>
                </section>
            </div>
        </div>
    );
}
