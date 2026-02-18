"use client";

import { useState } from 'react';
import styles from './page.module.css';

export default function SecurityPage() {
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Security</h1>
                <p className={styles.subtitle}>Update your password and security settings.</p>
            </header>

            {/* Password Change */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Change Password</h2>
                    <p className={styles.sectionDesc}>Ensure your account is secure with a strong password.</p>
                </div>

                <form className={styles.formGroup} onSubmit={(e) => e.preventDefault()}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Current Password</label>
                        <input type="password" className={styles.input} placeholder="Enter current password" />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>New Password</label>
                        <input type="password" className={styles.input} placeholder="Enter new password" />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Confirm New Password</label>
                        <input type="password" className={styles.input} placeholder="Confirm new password" />
                    </div>
                    <button type="submit" className={styles.saveBtn}>Update Password</button>
                </form>
            </section>

            {/* 2FA */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Two-Factor Authentication</h2>
                    <p className={styles.sectionDesc}>Add an extra layer of security to your account.</p>
                </div>

                <div className={styles.twoFactorContent}>
                    <div className={styles.twoFactorInfo}>
                        <div className={`${styles.statusBadge} ${twoFactorEnabled ? styles.enabled : styles.disabled}`}>
                            {twoFactorEnabled ? (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    Enabled
                                </>
                            ) : 'Disabled'}
                        </div>
                        <p className={styles.sectionDesc}>
                            Use an authenticator app (like Google Authenticator) to scan a QR code or receive a code via SMS to log in.
                        </p>
                    </div>
                    <button
                        className={styles.toggleBtn}
                        onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    >
                        {twoFactorEnabled ? 'Disable 2FA' : 'Setup 2FA'}
                    </button>
                </div>
            </section>

            {/* Danger Zone */}
            <section className={`${styles.section} ${styles.dangerZone}`}>
                <div className={styles.sectionHeader} style={{ borderBottom: 'none', marginBottom: 0 }}>
                    <h2 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>Delete Account</h2>
                    <p className={styles.sectionDesc}>
                        Permanently delete your account and all of your content. This action cannot be undone.
                    </p>
                    <button className={styles.deleteBtn}>Delete Account</button>
                </div>
            </section>
        </div>
    );
}
