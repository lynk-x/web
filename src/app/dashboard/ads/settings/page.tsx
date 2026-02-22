"use client";

import { useState } from 'react';
import styles from './page.module.css';
import { useToast } from '@/components/ui/Toast';

export default function AdsSettingsPage() {
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        showToast('Saving settings...', 'info');
        setTimeout(() => {
            setIsSaving(false);
            showToast('Settings saved successfully.', 'success');
        }, 1500);
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
                        <input type="text" className={styles.input} defaultValue="John's Ads Account" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Contact Email</label>
                        <input type="email" className={styles.input} defaultValue="john@doe.com" />
                    </div>
                </section>

                {/* Business Details */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Business Details</h2>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Legal Business Name</label>
                        <input type="text" className={styles.input} defaultValue="John Doe Productions Ltd" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Tax ID / PIN</label>
                        <input type="text" className={styles.input} placeholder="P051XXXXXX" defaultValue="P051234567W" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Business Address</label>
                        <textarea className={styles.textarea} defaultValue="Westlands, Nairobi, Kenya" />
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
