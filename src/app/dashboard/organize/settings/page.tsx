"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import adminStyles from '../../admin/page.module.css'; // For shared tab styles if any, or we build our own
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import MemberTable from '@/components/organize/MemberTable'; // Need to create this


export default function OrganizerSettingsPage() {
    const { showToast } = useToast();
    const { activeAccount, refreshAccounts } = useOrganization();
    const supabase = createClient();

    const [activeTab, setActiveTab] = useState<'profile' | 'team'>('profile');

    // Form State
    const [isSaving, setIsSaving] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
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

            {/* Sub-nav Tabs */}
            <div className={styles.tabs} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '24px', marginBottom: '24px', paddingBottom: '0' }}>
                <button
                    className={`${styles.tab} ${activeTab === 'profile' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('profile')}
                    style={{ background: 'transparent', border: 'none', borderBottom: activeTab === 'profile' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'profile' ? 'white' : 'rgba(255,255,255,0.6)', padding: '0 0 12px 0', fontSize: '15px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2sease' }}
                >
                    Profile & Settings
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'team' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('team')}
                    style={{ background: 'transparent', border: 'none', borderBottom: activeTab === 'team' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'team' ? 'white' : 'rgba(255,255,255,0.6)', padding: '0 0 12px 0', fontSize: '15px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2sease' }}
                >
                    Team Members
                </button>
            </div>

            {activeTab === 'profile' && (
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

                    {/* Security Data */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Change Password</h2>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Current Password</label>
                            <input type="password" className={styles.input} placeholder="Enter current password" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>New Password</label>
                            <input type="password" className={styles.input} placeholder="Enter new password" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Confirm New Password</label>
                            <input type="password" className={styles.input} placeholder="Confirm new password" />
                        </div>
                        <button type="button" className={styles.secondaryBtn} style={{ alignSelf: 'flex-start', marginTop: '8px' }}>Update Password</button>
                    </section>

                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Two-Factor Authentication</h2>
                        <div className={styles.twoFactorContent}>
                            <div className={styles.twoFactorInfo}>
                                <div className={`${styles.statusBadge} ${twoFactorEnabled ? styles.enabled : styles.disabled}`}>
                                    {twoFactorEnabled ? (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            Enabled
                                        </>
                                    ) : 'Disabled'}
                                </div>
                                <p className={styles.label} style={{ whiteSpace: 'normal', lineHeight: 1.5 }}>
                                    Use an authenticator app (like Google Authenticator) to scan a QR code or receive a code via SMS to log in.
                                </p>
                            </div>
                            <button
                                type="button"
                                className={styles.toggleBtn}
                                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                            >
                                {twoFactorEnabled ? 'Disable' : 'Setup'}
                            </button>
                        </div>
                    </section>

                    <section className={`${styles.section} ${styles.dangerZone}`}>
                        <h2 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>Danger Zone</h2>
                        <p className={styles.label} style={{ marginBottom: '16px', whiteSpace: 'normal', lineHeight: 1.5 }}>
                            Permanently delete your account and all of your content. This action cannot be undone.
                        </p>
                        <button type="button" className={styles.deleteBtn}>Delete Account</button>
                    </section>
                </div>
            )}

            {activeTab === 'team' && (
                <div className={styles.section} style={{ padding: 0, background: 'transparent', border: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div>
                            <h2 className={styles.sectionTitle} style={{ marginBottom: '4px' }}>Team Management</h2>
                            <p className={styles.label} style={{ whiteSpace: 'normal' }}>Invite collaborators and manage access levels for your organization.</p>
                        </div>
                        <button className={styles.saveBtn} onClick={() => showToast('Inviting new member...', 'info')} style={{ background: 'white', color: 'black' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            Invite Member
                        </button>
                    </div>

                    <MemberTable />
                </div>
            )}
        </div>
    );
}
