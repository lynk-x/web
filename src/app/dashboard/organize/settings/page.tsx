"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import MemberTable from '@/components/organize/MemberTable';
import PaymentMethodsManager from '@/components/organize/PaymentMethodsManager';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import Tabs from '@/components/dashboard/Tabs';

function SettingsContent() {
    const { showToast } = useToast();
    const { activeAccount, refreshAccounts } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialTab = (searchParams.get('tab') as any) || 'profile';
    const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'payment-methods' | 'settings'>(
        ['profile', 'team', 'payment-methods', 'settings'].includes(initialTab) ? initialTab : 'profile'
    );

    // Handle initial tab from query param and sync with state
    useEffect(() => {
        const tab = searchParams.get('tab') as any;
        if (tab && ['profile', 'team', 'payment-methods', 'settings'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as any);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    // Form State
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Change password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
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
            if (refreshAccounts) await refreshAccounts();
        } catch (err: any) {
            showToast(err.message || 'Failed to update settings.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    /** Update password via Supabase Auth. */
    const handleChangePassword = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            showToast('Passwords do not match.', 'error');
            return;
        }
        if (newPassword.length < 8) {
            showToast('Password must be at least 8 characters.', 'error');
            return;
        }
        setIsChangingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            showToast('Password updated successfully.', 'success');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            showToast(err.message || 'Failed to update password.', 'error');
        } finally {
            setIsChangingPassword(false);
        }
    };

    /** Soft-delete: deactivates the organizer account. */
    const handleDeleteAccount = async () => {
        if (!activeAccount) return;
        try {
            const { error } = await supabase
                .from('accounts')
                .update({ is_active: false })   // Fix #4: accounts has no `status` column; use is_active
                .eq('id', activeAccount.id);

            if (error) throw error;
            showToast('Account deactivation requested. Our team will process this within 24 hours.', 'success');
            setIsDeleteModalOpen(false);
        } catch (err: any) {
            showToast(err.message || 'Failed to deactivate account.', 'error');
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

            <Tabs
                options={[
                    { id: 'profile', label: 'Profile' },
                    { id: 'team', label: 'Team Members' },
                    { id: 'payment-methods', label: 'Payment Methods' },
                    { id: 'settings', label: 'Settings' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {activeTab === 'profile' && (
                <div className={styles.columnLayout}>
                    {/* Organization Profile & Support Contact */}
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

                        <div style={{ marginTop: '12px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, opacity: 0.8 }}>Support Contact</h3>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Support Email</label>
                                <input type="email" name="support_email" className={styles.input} value={formData.support_email} onChange={handleInputChange} placeholder="support@domain.com" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Support Phone</label>
                                <input type="text" name="phone_number" className={styles.input} value={formData.phone_number} onChange={handleInputChange} placeholder="+254..." />
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'team' && (
                <MemberTable />
            )}

            {activeTab === 'payment-methods' && (
                <div className={styles.columnLayout}>
                    {activeAccount ? (
                        <PaymentMethodsManager accountId={activeAccount.id} />
                    ) : (
                        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Select an organization to manage payment methods.</div>
                    )}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className={styles.columnLayout}>
                    {/* Security Data */}
                    {/* Change Password */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Change Password</h2>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Current Password</label>
                            <input type="password" className={styles.input} placeholder="Enter current password"
                                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>New Password</label>
                            <input type="password" className={styles.input} placeholder="Min. 8 characters"
                                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Confirm New Password</label>
                            <input type="password" className={styles.input} placeholder="Repeat new password"
                                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                        <button type="button" className={styles.secondaryBtn}
                            style={{ alignSelf: 'flex-start', marginTop: '8px' }}
                            onClick={handleChangePassword}
                            disabled={isChangingPassword}
                        >
                            {isChangingPassword ? 'Updating…' : 'Update Password'}
                        </button>
                    </section>

                    <section className={`${styles.section} ${styles.dangerZone}`}>
                        <h2 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>Danger Zone</h2>
                        <p className={styles.label} style={{ marginBottom: '16px', whiteSpace: 'normal', lineHeight: 1.5 }}>
                            Deactivates your organizer account and removes it from public listings. This cannot be undone without contacting support.
                        </p>
                        <button type="button" className={styles.deleteBtn} onClick={() => setIsDeleteModalOpen(true)}>Deactivate Account</button>
                    </section>
                </div>
            )}



            {/* Account deactivation confirmation */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteAccount}
                title="Deactivate Organizer Account?"
                message="Your organization will be removed from public listings. Ongoing events may be affected. Contact support to reverse this."
                confirmLabel="Deactivate"
                variant="danger"
            />
        </div>
    );
}

export default function OrganizerSettingsPage() {
    return (
        <Suspense fallback={<div className={styles.loading}>Loading Settings...</div>}>
            <SettingsContent />
        </Suspense>
    );
}
