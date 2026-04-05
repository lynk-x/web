"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import Tabs from '@/components/dashboard/Tabs';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import MemberTable from '@/components/features/members/MemberTable';
import PaymentMethodsManager from '@/components/features/members/PaymentMethodsManager';
import KycStatusCard from '@/components/dashboard/KycStatusCard';

function AdsSettingsContent() {
    const { activeAccount, isLoading: isOrgLoading, refreshAccounts } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialTab = (searchParams.get('tab') as string) || 'account';
    const [activeTab, setActiveTab] = useState<'account' | 'team' | 'billing' | 'danger-zone'>(
        (['account', 'team', 'billing', 'danger-zone'] as string[]).includes(initialTab) ? initialTab as 'account' | 'team' | 'billing' | 'danger-zone' : 'account'
    );
    const [pendingTab, setPendingTab] = useState<string | null>(null);

    const [isSaving, setIsSaving] = useState(false);

    // Form state
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


    useEffect(() => {
        const tab = searchParams.get('tab') as string;
        if (tab && ['account', 'team', 'billing', 'danger-zone'].includes(tab)) {
            setActiveTab(tab as typeof activeTab);
        }
    }, [searchParams]);

    useEffect(() => {
        if (isOrgLoading || !activeAccount) return;

        const fetchAllData = async () => {
            const { data: bizData } = await supabase
                .from('business_profile')
                .select('info, tax_id, registration_number, billing_address')
                .eq('account_id', activeAccount.id)
                .maybeSingle();

            // Contact/profile data is in business_profile.info JSONB
            setFormData({
                name: activeAccount.name || '',
                website: (bizData?.info as any)?.website || '',
                description: (bizData?.info as any)?.description || '',
                support_email: (bizData?.info as any)?.contact_email || '',
                phone_number: (bizData?.info as any)?.phone_number || '',
                business_name: (bizData?.info as any)?.legal_name || '',
                tax_id: bizData?.tax_id || '',
                registration_number: bizData?.registration_number || '',
                billing_address: typeof bizData?.billing_address === 'string' ? bizData.billing_address : JSON.stringify(bizData?.billing_address || '')
            });
        };

        fetchAllData();
    }, [isOrgLoading, activeAccount, supabase]);

    const isDirty = useMemo(() => {
        if (!activeAccount) return false;
        return (
            formData.name !== (activeAccount.name || '') ||
            formData.support_email !== '' ||
            formData.description !== '' ||
            formData.phone_number !== '' ||
            formData.business_name !== '' ||
            formData.tax_id !== '' ||
            formData.registration_number !== '' ||
            formData.billing_address !== ''
        );
    }, [formData, activeAccount]);

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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!activeAccount) return;
        setIsSaving(true);
        try {
            // accounts only holds display_name — all contact/profile data lives in business_profile.info
            const { error: accError } = await supabase
                .from('accounts')
                .update({ display_name: formData.name })
                .eq('id', activeAccount.id);

            if (accError) throw accError;

            // Upsert contacts and legal info into business_profile.info JSONB
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
            if (refreshAccounts) await refreshAccounts();
        } catch (error: any) {
            showToast(error.message || 'Failed to save settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className={adminStyles.container}>
            <PageHeader
                title="Ads Settings"
                subtitle="Manage your advertising account preferences and business information."
                actionLabel={isSaving ? "Saving..." : "Save Changes"}
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

            <div className={adminStyles.container}>
                {activeTab === 'account' && (
                    <div className={adminStyles.pageCard}>
                        {activeAccount && <KycStatusCard accountId={activeAccount.id} />}
                        <h2 className={adminStyles.sectionTitle}>Account Profile</h2>
                        <div className={adminStyles.formGrid}>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Account Name <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                <input type="text" name="name" className={adminStyles.input} value={formData.name} onChange={handleInputChange} placeholder="e.g. Acme Ads" />
                            </div>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Support Email <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                <input type="email" name="support_email" className={adminStyles.input} value={formData.support_email} onChange={handleInputChange} placeholder="ads-support@organization.com" />
                            </div>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Support Phone</label>
                                <input type="text" name="phone_number" className={adminStyles.input} value={formData.phone_number} onChange={handleInputChange} placeholder="+254..." />
                            </div>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Website URL</label>
                                <input type="text" name="website" className={adminStyles.input} value={formData.website} onChange={handleInputChange} placeholder="https://..." />
                            </div>
                            <div style={{ gridColumn: '1 / -1', margin: '12px 0', borderBottom: '1px solid var(--color-interface-outline)' }} />

                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Legal Name <span className={adminStyles.labelHint}>(Individual or Company)</span> <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                <input type="text" name="business_name" className={adminStyles.input} value={formData.business_name} onChange={handleInputChange} placeholder="As registered with authorities" />
                            </div>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Tax ID / PIN <span className={adminStyles.labelHint}>(Individual or Company)</span> <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                <input type="text" name="tax_id" className={adminStyles.input} value={formData.tax_id} onChange={handleInputChange} placeholder="VAT / EIN / KRA PIN" />
                            </div>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Registration Number <span className={adminStyles.labelHint}>(if business)</span></label>
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
                    <div className={adminStyles.pageCard}>
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
                                Deactivating your ads account pauses all active campaigns indefinitely. This action cannot be undone from the dashboard.
                            </p>
                            <button
                                type="button"
                                className={adminStyles.btnDanger}
                                onClick={() => showToast('Deactivation requires support contact.', 'error')}
                            >
                                Deactivate Ads Account
                            </button>
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
        </div>
    );
}

export default function AdsSettingsPage() {
    return (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Loading Settings...</div>}>
            <AdsSettingsContent />
        </Suspense>
    );
}
