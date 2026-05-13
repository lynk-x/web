"use client";
import { getErrorMessage } from '@/utils/error';

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
import CountrySelect from '@/components/shared/CountrySelect';

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
    const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        website: '',
        description: '',
        support_email: '',
        phone_number: '',
        address_line: '',
        town: '',
        city: '',
        country: ''
    });

    const [initialFormData, setInitialFormData] = useState(formData);

    const isDirty = useMemo(() => {
        if (!activeAccount) return false;
        return JSON.stringify(formData) !== JSON.stringify(initialFormData);
    }, [formData, initialFormData, activeAccount]);

    useEffect(() => {
        const tab = searchParams.get('tab') as string;
        if (tab && ['account', 'team', 'billing', 'danger-zone'].includes(tab)) {
            setActiveTab(tab as typeof activeTab);
        }
    }, [searchParams]);

    useEffect(() => {
        if (isOrgLoading || !activeAccount) return;

        const fetchAllData = async () => {
            try {
                const { data, error } = await supabase.rpc('get_advertiser_account_settings', {
                    p_account_id: activeAccount.id
                });

                if (error) throw error;

                const profile = data.profile || {};
                const ba = typeof profile.billing_address === 'string' ? {} : (profile.billing_address || {});
                const newValues = {
                    name: data.account?.name || '',
                    website: profile.website || '',
                    description: profile.description || '',
                    support_email: profile.contact_email || '',
                    phone_number: profile.phone_number || '',
                address_line: ba.line || (typeof profile.billing_address === 'string' ? profile.billing_address : ''),
                town: ba.town || '',
                city: ba.city || '',
                country: ba.country || data.account?.country_code || ''
            };

                setFormData(newValues);
                setInitialFormData(newValues);
            } catch (err) {
                showToast(getErrorMessage(err) || 'Failed to sync your account settings.', 'error');
            }
        };

        fetchAllData();
    }, [isOrgLoading, activeAccount, supabase, showToast]);

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
            const { error } = await supabase.rpc('update_advertiser_account_settings', {
                p_account_id: activeAccount.id,
                p_display_name: formData.name,
                p_info: {
                    legal_name: formData.name,
                    contact_email: formData.support_email,
                    phone_number: formData.phone_number,
                    description: formData.description,
                    website: formData.website,
                },
                p_billing_address: JSON.stringify({
                    line: formData.address_line,
                    town: formData.town,
                    city: formData.city,
                    country: formData.country
                })
            });

            if (error) throw error;

            showToast('Settings saved successfully.', 'success');
            setInitialFormData(formData);
            if (refreshAccounts) await refreshAccounts();
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to save settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };


    const handleDeactivate = async () => {
        if (!activeAccount) return;
        setIsDeactivating(true);
        try {
            const { error } = await supabase.rpc('deactivate_ads_account', {
                p_account_id: activeAccount.id
            });

            if (error) throw error;

            showToast('Ads account deactivated. All active campaigns have been paused.', 'success');
            setIsDeactivateModalOpen(false);
            if (refreshAccounts) await refreshAccounts();
            router.push('/dashboard/ads');
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to deactivate account.', 'error');
        } finally {
            setIsDeactivating(false);
        }
    };
;

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
                                <label className={adminStyles.label}>Address Line <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                <input type="text" name="address_line" className={adminStyles.input} value={formData.address_line} onChange={handleInputChange} placeholder="e.g. 123 Event Street" />
                            </div>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Town</label>
                                <input type="text" name="town" className={adminStyles.input} value={formData.town} onChange={handleInputChange} placeholder="e.g. Westlands" />
                            </div>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>City <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                <input type="text" name="city" className={adminStyles.input} value={formData.city} onChange={handleInputChange} placeholder="e.g. Nairobi" />
                            </div>
                            <div className={adminStyles.formGroup}>
                                <label className={adminStyles.label}>Country <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                <CountrySelect 
                                    value={formData.country} 
                                    onChange={(val) => setFormData(prev => ({ ...prev, country: val }))} 
                                />
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
                                onClick={() => setIsDeactivateModalOpen(true)}
                                disabled={isDeactivating}
                            >
                                {isDeactivating ? 'Deactivating...' : 'Deactivate Ads Account'}
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

            <ConfirmationModal
                isOpen={isDeactivateModalOpen}
                onClose={() => setIsDeactivateModalOpen(false)}
                onConfirm={handleDeactivate}
                title="Deactivate Ads Account"
                message="This will pause all active campaigns and suspend your ads account. You will need to contact support to reactivate. Are you sure?"
                confirmLabel={isDeactivating ? 'Deactivating...' : 'Yes, Deactivate'}
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
