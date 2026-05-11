"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { sanitizeInput } from '@/utils/sanitization';
import MemberTable from '@/components/features/members/MemberTable';
import PaymentMethodsManager from '@/components/features/members/PaymentMethodsManager';
import WalletsTable from '@/components/features/finance/WalletsTable';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import Tabs from '@/components/dashboard/Tabs';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import KycStatusCard from '@/components/dashboard/KycStatusCard';
import ProductTour from '@/components/dashboard/ProductTour';
import type { AccountWallet } from '@/types/organize';

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
    const [isLoading, setIsLoading] = useState(true);
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
    const [wallets, setWallets] = useState<AccountWallet[]>([]);
    const [initialFormData, setInitialFormData] = useState(formData);

    const fetchData = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const { data: settings, error } = await supabase.rpc('get_organizer_settings', {
                p_account_id: activeAccount.id
            });

            if (error) throw error;

            const profile = settings?.profile || {};
            const newValues = {
                name: settings?.account?.name || '',
                website: profile.website || '',
                description: profile.description || '',
                support_email: profile.contact_email || '',
                phone_number: profile.phone_number || '',
                business_name: profile.legal_name || '',
                tax_id: profile.tax_id || '',
                registration_number: profile.registration_number || '',
                billing_address: profile.billing_address || ''
            };

            setFormData(newValues);
            setInitialFormData(newValues);
            setWallets((settings?.wallets || []).map((w: AccountWallet) => ({ ...w, id: w.currency })));
        } catch (err) {
            showToast(getErrorMessage(err) || 'Failed to sync organization settings.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast]);

    useEffect(() => {
        if (activeAccount) {
            fetchData();
        }
    }, [activeAccount, fetchData]);

    const isDirty = useMemo(() => {
        if (!activeAccount) return false;
        return JSON.stringify(formData) !== JSON.stringify(initialFormData);
    }, [formData, initialFormData, activeAccount]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const sanitizedValue = sanitizeInput(value);
        setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    };

    const handleSave = async () => {
        if (!activeAccount) return;
        setIsSaving(true);
        try {
            const { error } = await supabase.rpc('update_organizer_settings', {
                p_account_id: activeAccount.id,
                p_display_name: formData.name,
                p_info: {
                    legal_name: formData.business_name || formData.name,
                    contact_email: formData.support_email,
                    phone_number: formData.phone_number,
                    description: formData.description,
                    website: formData.website,
                },
                p_tax_id: formData.tax_id,
                p_registration_number: formData.registration_number,
                p_billing_address: formData.billing_address
            });

            if (error) throw error;

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
            // Reusing bulk status update for deactivation
            const { error } = await supabase.rpc('bulk_update_events_status', {
                p_account_id: activeAccount.id,
                p_event_ids: [], // Placeholder to trigger general account logic if we had a dedicated deactivate rpc
                p_status: 'deactivated'
            }).then(async () => {
                // Since we don't have a dedicated deactivate_account RPC yet that handles soft-delete fully,
                // we'll stick to the existing behavior but wrapped in a safe way.
                return await supabase
                    .from('accounts')
                    .update({ is_active: false })
                    .eq('id', activeAccount.id);
            });

            if (error) throw error;
            showToast('Account deactivation requested.', 'success');
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
                        { id: 'billing', label: 'Billing & Wallet' },
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className={adminStyles.pageCard}>
                            <h2 className={adminStyles.sectionTitle}>Payment Methods</h2>
                            {activeAccount ? (
                                <PaymentMethodsManager accountId={activeAccount.id} />
                            ) : (
                                <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Select an organization to manage payment methods.</div>
                            )}
                        </div>

                        <div className={adminStyles.pageCard}>
                            <h2 className={adminStyles.sectionTitle}>Account Wallets</h2>
                            <WalletsTable data={wallets} isLoading={isLoading} />
                        </div>
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
