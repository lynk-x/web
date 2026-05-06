"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { sanitizeInput } from '@/utils/sanitization';
import MemberTable from '@/components/features/members/MemberTable';
import PaymentMethodsManager from '@/components/features/members/PaymentMethodsManager';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import Tabs from '@/components/dashboard/Tabs';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import KycStatusCard from '@/components/dashboard/KycStatusCard';
import ProductTour from '@/components/dashboard/ProductTour';

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
        business_name: '',
        tax_id: '',
        registration_number: '',
        billing_address: ''
    });

    const [initialFormData, setInitialFormData] = useState(formData);

    const isDirty = useMemo(() => {
        if (!activeAccount) return false;
        return JSON.stringify(formData) !== JSON.stringify(initialFormData);
    }, [formData, initialFormData, activeAccount]);

    useEffect(() => {
        if (activeAccount) {
            const fetchBusinessData = async () => {
                const { data, error } = await supabase
                    .from('business_profile')
                    .select('*')
                    .eq('account_id', activeAccount.id)
                    .maybeSingle();

                const newValues = {
                    name: activeAccount.name || '',
                    website: (data?.info as any)?.website || '',
                    description: (data?.info as any)?.description || '',
                    support_email: (data?.info as any)?.contact_email || '',
                    phone_number: (data?.info as any)?.phone_number || '',
                    business_name: (data?.info as any)?.legal_name || '',
                    tax_id: data?.tax_id || '',
                    registration_number: data?.registration_number || '',
                    billing_address: typeof data?.billing_address === 'string' ? data.billing_address : JSON.stringify(data?.billing_address || '')
                };

                setFormData(newValues);
                setInitialFormData(newValues);
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
            // accounts only holds display_name — contact/profile data lives in business_profile.info
            const { error: accError } = await supabase
                .from('accounts')
                .update({ display_name: formData.name })
                .eq('id', activeAccount.id);

            if (accError) throw accError;

            // Update Business Profile: merge contact/description into the info JSONB
            const { error: bizError } = await supabase
                .from('business_profile')
                .upsert({
                    account_id: activeAccount.id,
                    info: {
                        legal_name: formData.business_name || formData.name,
                        contact_email: formData.support_email,
                        phone_number: formData.phone_number,
                        description: formData.description,
                        website: formData.website,
                    },
                    tax_id: formData.tax_id,
                    registration_number: formData.registration_number,
                    billing_address: formData.billing_address
                }, { onConflict: 'account_id' });

            if (bizError) throw bizError;

            showToast('Settings saved successfully.', 'success');
            setInitialFormData(formData);
            if (refreshAccounts) await refreshAccounts();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to update settings.', 'error');
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
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to deactivate account.', 'error');
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
                subtitle="Configure your organization profile, team members and advertising preferences."
                actionLabel={isSaving ? "Saving..." : "Save Settings"}
                onActionClick={handleSave}
                actionIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline></svg>}
                actionClassName="tour-settings-save"
            />

            <div style={{ marginBottom: '24px' }} className="tour-settings-tabs">
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
                        {activeAccount && (
                            <div className="tour-settings-kyc">
                                <KycStatusCard accountId={activeAccount.id} />
                            </div>
                        )}
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
                confirmText="DEACTIVATE"
            />

            <ProductTour
                storageKey={activeAccount ? `hasSeenOrgSettingsJoyride_${activeAccount.id}` : 'hasSeenOrgSettingsJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Organizer Settings',
                        content: 'Configure your organization\'s identity, team members and payout preferences.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-settings-tabs',
                        title: 'Configuration Tabs',
                        content: 'Switch between Account profile, Team member management and Billing/Payout setup.',
                    },
                    {
                        target: '.tour-settings-kyc',
                        title: 'KYC Verification',
                        content: 'To receive payouts, you must verify your identity. Check your current verification status here.',
                    },
                    {
                        target: '.tour-settings-save',
                        title: 'Apply Changes',
                        content: 'Don\'t forget to save your settings after making any changes to your profile or preferences.',
                    }
                ]}
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
