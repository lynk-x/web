"use client";

import { useState } from 'react';
import styles from './page.module.css';
import { useToast } from '@/components/ui/Toast';

export default function AdsNotificationsPage() {
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        showToast('Updating notification preferences...', 'info');
        setTimeout(() => {
            setIsSaving(false);
            showToast('Preferences updated successfully.', 'success');
        }, 1500);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Ads Notifications</h1>
                    <p className={styles.subtitle}>Choose how you want to be notified about your advertising campaigns.</p>
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
                    {isSaving ? 'Saving...' : 'Save Preferences'}
                </button>
            </header>

            <div className={styles.content}>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Email Notifications</h2>
                    <div className={styles.toggleGroup}>
                        <div className={styles.toggleItem}>
                            <div>
                                <div className={styles.toggleLabel}>Daily Summary</div>
                                <div className={styles.toggleDesc}>A daily overview of your ad spend and impressions.</div>
                            </div>
                            <label className={styles.toggleSwitch}>
                                <input type="checkbox" defaultChecked />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
                        <div className={styles.toggleItem}>
                            <div>
                                <div className={styles.toggleLabel}>Weekly Performance Reports</div>
                                <div className={styles.toggleDesc}>Detailed analysis of your campaign ROAS and engagement.</div>
                            </div>
                            <label className={styles.toggleSwitch}>
                                <input type="checkbox" defaultChecked />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
                        <div className={styles.toggleItem}>
                            <div>
                                <div className={styles.toggleLabel}>Billing & Payments</div>
                                <div className={styles.toggleDesc}>Invoices, payment success/failure, and budget alerts.</div>
                            </div>
                            <label className={styles.toggleSwitch}>
                                <input type="checkbox" defaultChecked />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>App Push Notifications</h2>
                    <div className={styles.toggleGroup}>
                        <div className={styles.toggleItem}>
                            <div>
                                <div className={styles.toggleLabel}>Campaign Status Changes</div>
                                <div className={styles.toggleDesc}>Get notified immediately when a campaign is approved or paused.</div>
                            </div>
                            <label className={styles.toggleSwitch}>
                                <input type="checkbox" defaultChecked />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
                        <div className={styles.toggleItem}>
                            <div>
                                <div className={styles.toggleLabel}>Budget Alerts</div>
                                <div className={styles.toggleDesc}>Alerts when your daily budget reaches 80% or 100%.</div>
                            </div>
                            <label className={styles.toggleSwitch}>
                                <input type="checkbox" defaultChecked />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
                        <div className={styles.toggleItem}>
                            <div>
                                <div className={styles.toggleLabel}>Critical Updates</div>
                                <div className={styles.toggleDesc}>Major changes to the advertising platform or policy updates.</div>
                            </div>
                            <label className={styles.toggleSwitch}>
                                <input type="checkbox" defaultChecked />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
