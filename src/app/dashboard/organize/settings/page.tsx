"use client";

import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { sanitizeInput } from '@/utils/sanitization';
import MemberTable from '@/components/organize/MemberTable';
import PaymentMethodsManager from '@/components/organize/PaymentMethodsManager';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import Tabs from '@/components/dashboard/Tabs';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';

function SettingsContent() {
    const { showToast } = useToast();
    const { activeAccount, refreshAccounts } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialTab = (searchParams.get('tab') as string) || 'account';
    const [activeTab, setActiveTab] = useState<'account' | 'team' | 'billing' | 'danger-zone'>(
        (['account', 'team', 'billing', 'danger-zone'] as string[]).includes(initialTab) ? initialTab as 'account' | 'team' | 'billing' | 'danger-zone' : 'account'
    );
    const [pendingTab, setPendingTab] = useState<string | null>(null);

    useEffect(() => {
        const tab = searchParams.get('tab') as string;
        if (tab && ['account', 'team', 'billing', 'danger-zone'].includes(tab)) {
            setActiveTab(tab as typeof activeTab);
        }
    }, [searchParams]);


    const handleTabChange = (newTab: string) => {
        if (isDirty && activeTab !== newTab) {
            setPendingTab(newTab);
            return;
        }
        confirmTabChange(newTab);
    };

    const confirmTabChange = (newTab: string) => {
        setActiveTab(newTab as Extract<typeof activeTab, string>);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
        setPendingTab(null);
    };

    const [isSaving, setIsSaving] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        website: '',
        description: '',
        support_email: '',
        phone_number: '',
        // Business Profile
        business_name: '',
        tax_id: '',
        registration_number: '',
        billing_address: ''
    });

    const isDirty = useMemo(() => {
        if (!activeAccount) return false;
        const aa = activeAccount as any;
        return (
            formData.name !== (aa.name || '') ||
            formData.website !== (aa.website || '') ||
            formData.description !== (aa.description || '') ||
            formData.support_email !== (aa.support_email || '') ||
            formData.phone_number !== (aa.phone_number || '') ||
            formData.business_name !== (aa.business_name || '') ||
            formData.tax_id !== (aa.tax_id || '') ||
            formData.registration_number !== (aa.registration_number || '') ||
            formData.billing_address !== (aa.billing_address || '')
        );
    }, [formData, activeAccount]);

    useEffect(() => {
        if (activeAccount) {
            const fetchBusinessData = async () => {
                const { data, error } = await supabase
                    .from('business_profile')
                    .select('*')
                    .eq('account_id', activeAccount.id)
                    .maybeSingle();

                if (!error && data) {
                    setFormData({
                        name: activeAccount.name || '',
                        website: activeAccount.website || '',
                        description: activeAccount.description || '',
                        support_email: activeAccount.support_email || '',
                        phone_number: activeAccount.phone_number || '',
                        business_name: data.business_name || '',
                        tax_id: data.tax_id || '',
                        registration_number: data.registration_number || '',
                        billing_address: typeof data.billing_address === 'string' ? data.billing_address : JSON.stringify(data.billing_address || '')
                    });
                    // Patch activeAccount in memory for dirty check (cast to any)
                    const aa = activeAccount as any;
                    aa.business_name = data.business_name || '';
                    aa.tax_id = data.tax_id || '';
                    aa.registration_number = data.registration_number || '';
                    aa.billing_address = typeof data.billing_address === 'string' ? data.billing_address : JSON.stringify(data.billing_address || '');
                } else {
                    setFormData({
                        name: activeAccount.name || '',
                        website: activeAccount.website || '',
                        description: activeAccount.description || '',
                        support_email: activeAccount.support_email || '',
                        phone_number: activeAccount.phone_number || '',
                        business_name: '',
                        tax_id: '',
                        registration_number: '',
                        billing_address: ''
                    });
                }
            };
            fetchBusinessData();
        }
    }, [activeAccount, supabase]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const sanitizedValue = (name !== 'is_active') ? sanitizeInput(value) : value;
        setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    };

    const handleSave = async () => {
        if (!activeAccount) return;
        setIsSaving(true);
        try {
            // Update Accounts table
            const { error: accError } = await supabase
                .from('accounts')
                .update({
                    display_name: formData.name,
                    contact_email: formData.support_email,
                    description: formData.description,
                    phone_number: formData.phone_number
                    // website was removed from DB schema
                })
                .eq('id', activeAccount.id);

            if (accError) throw accError;

            // Update Business Profile table
            const { error: bizError } = await supabase
                .from('business_profile')
                .upsert({
                    account_id: activeAccount.id,
                    business_name: formData.business_name || formData.name, // Fallback to display name
                    tax_id: formData.tax_id,
                    registration_number: formData.registration_number,
                    billing_address: formData.billing_address
                });

            if (bizError) throw bizError;

            showToast('Settings saved successfully.', 'success');
            if (refreshAccounts) await refreshAccounts();
        } catch (err: any) {
            showToast(err.message || 'Failed to update settings.', 'error');
        } finally {
            setIsSaving(false);
        }
    };


    const handleDeleteAccount = async () => {
        if (!activeAccount) return;
        try {
            const { error } = await supabase
                .from('accounts')
                .update({ is_active: false })
                .eq('id', activeAccount.id);

            if (error) throw error;
            showToast('Account deactivation requested. Our team will process this within 24 hours.', 'success');
            setIsDeleteModalOpen(false);
        } catch (err: any) {
            showToast(err.message || 'Failed to deactivate account.', 'error');
        }
    };

    const settingsContainerRef = useRef<HTMLDivElement>(null);

    // ── Autofocus Logic ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!settingsContainerRef.current) return;

        const timer = setTimeout(() => {
            if (!settingsContainerRef.current) return;
            const firstFocusable = settingsContainerRef.current.querySelector(
                'input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]), select, textarea'
            ) as HTMLElement | null;

            if (firstFocusable) {
                firstFocusable.focus();
                if (firstFocusable instanceof HTMLInputElement && (firstFocusable.type === 'text' || firstFocusable.type === 'search')) {
                    const val = firstFocusable.value;
                    firstFocusable.value = '';
                    firstFocusable.value = val;
                }
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [activeTab]);

    return (
        <div className={adminStyles.container}>
            <PageHeader
                title="Organizer Settings"
                subtitle="Configure your organization profile, team members, and advertising preferences."
                actionLabel={isSaving ? "Saving..." : "Save Settings"}
                onActionClick={handleSave}
                actionIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline></svg>}
            />

            <div style={{ marginBottom: '24px' }}>
                <Tabs
                    options={[
                        { id: 'account', label: 'Account' },
                        { id: 'team', label: 'Team Members' },
                        { id: 'billing', label: 'Billing' },
                        { id: 'danger-zone', label: 'Danger Zone' }
                    ]}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                />
            </div>

            <div className={adminStyles.container} ref={settingsContainerRef}>
                {activeTab === 'account' && (
                    <div className={adminStyles.pageCard}>
                        <h2 className={adminStyles.sectionTitle}>Account Profile</h2>
                        <div className={adminStyles.formGrid}>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Organization Name <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                <input type="text" name="name" className={adminStyles.input} value={formData.name} onChange={handleInputChange} placeholder="e.g. Acme Events" />
                            </div>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Support Email <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                <input type="email" name="support_email" className={adminStyles.input} value={formData.support_email} onChange={handleInputChange} placeholder="support@organization.com" />
                            </div>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Support Phone</label>
                                <input type="text" name="phone_number" className={adminStyles.input} value={formData.phone_number} onChange={handleInputChange} placeholder="+254..." />
                            </div>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Website URL</label>
                                <input type="text" name="website" className={adminStyles.input} value={formData.website} onChange={handleInputChange} placeholder="https://organization.com" />
                            </div>
                            <div style={{ gridColumn: '1 / -1', margin: '12px 0', borderBottom: '1px solid var(--color-interface-outline)' }} />

                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Legal Name (Individual or Company) <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                <input type="text" name="business_name" className={adminStyles.input} value={formData.business_name} onChange={handleInputChange} placeholder="As registered with authorities" />
                            </div>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Tax ID / PIN (Individual or Company) <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                <input type="text" name="tax_id" className={adminStyles.input} value={formData.tax_id} onChange={handleInputChange} placeholder="VAT / EIN / KRA PIN" />
                            </div>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Registration Number (if business)</label>
                                <input type="text" name="registration_number" className={adminStyles.input} value={formData.registration_number} onChange={handleInputChange} placeholder="Business License #" />
                            </div>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Legal Billing Address <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                <input type="text" name="billing_address" className={adminStyles.input} value={formData.billing_address} onChange={handleInputChange} placeholder="City, State, Country..." />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className={adminStyles.pageCard} style={{ gridColumn: '1 / -1' }}>
                        <MemberTable />
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className={adminStyles.pageCard}>
                        {activeAccount ? (
                            <PaymentMethodsManager accountId={activeAccount.id} />
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Select an organization to manage payment methods.</div>
                        )}
                    </div>
                )}

                {activeTab === 'danger-zone' && (
                    <>

                        <div className={adminStyles.pageCard}>
                            <h2 className={adminStyles.sectionTitle} style={{ color: 'var(--color-interface-error)' }}>Danger Zone</h2>
                            <p className={adminStyles.label} style={{ marginBottom: '16px', fontWeight: 400, opacity: 0.8 }}>
                                Deactivates your organizer account and removes it from public listings. This action cannot be easily undone.
                            </p>
                            <button type="button" className={adminStyles.btnDanger} onClick={() => setIsDeleteModalOpen(true)}>Deactivate Account</button>
                        </div>
                    </>
                )}
            </div>

            <ConfirmationModal
                isOpen={!!pendingTab}
                onClose={() => setPendingTab(null)}
                onConfirm={() => {
                    if (pendingTab) confirmTabChange(pendingTab);
                }}
                title="Unsaved Changes"
                message="You have unsaved changes. Are you sure you want to leave this tab and lose your progress?"
                confirmLabel="Leave Tab"
                variant="danger"
            />

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
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Loading Settings...</div>}>
            <SettingsContent />
        </Suspense>
    );
}
