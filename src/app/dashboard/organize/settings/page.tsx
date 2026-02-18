"use client";

import { useState } from 'react';
import styles from './page.module.css';
import { useToast } from '@/components/ui/Toast';

export default function OrganizerSettingsPage() {
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        showToast('Saving organizer preferences...', 'info');
        setTimeout(() => {
            setIsSaving(false);
            showToast('Organizer settings updated.', 'success');
        }, 1500);
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
                        <input type="text" className={styles.input} defaultValue="Lynk-X Events" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Website URL</label>
                        <input type="text" className={styles.input} defaultValue="https://lynk-x.com" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Organization Bio</label>
                        <textarea className={styles.textarea} defaultValue="Official event organizer for premium experiences in East Africa." />
                    </div>
                </section>

                {/* Contact Information */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Support Contact</h2>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Support Email</label>
                        <input type="email" className={styles.input} defaultValue="support@lynk-x.com" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Support Phone</label>
                        <input type="text" className={styles.input} defaultValue="+254 712 345678" />
                    </div>
                </section>
            </div>
        </div>
    );
}
