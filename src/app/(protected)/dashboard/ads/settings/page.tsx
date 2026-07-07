"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import { MfaManager } from '@/components/MfaManager';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import Modal from '@/components/shared/Modal';
import PageHeader from '@/components/dashboard/PageHeader';
import MemberTable from '@/components/features/members/MemberTable';
import PaymentMethodsManager from '@/components/features/members/PaymentMethodsManager';
import KycStatusCard from '@/components/dashboard/KycStatusCard';
import WalletManager from '@/components/features/finance/WalletManager';
import CountrySelect from '@/components/shared/CountrySelect';
import Input from '@/components/shared/Input';
import Button from '@/components/shared/Button';
import Textarea from '@/components/shared/Textarea';
import type { AccountWallet } from '@/types/organize';
import Spinner from '@/components/shared/Spinner';

function AdsSettingsContent() {
    const { activeAccount, isLoading: isOrgLoading, refreshAccounts } = useOrganization();
    const { user, isLoading: authLoading } = useAuth();
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
    const [isLoading, setIsLoading] = useState(true);
    const [wallets, setWallets] = useState<AccountWallet[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        secondary_contact: '',
        description: '',
        support_email: '',
        primary_contact: '',
        address_line: '',
        town: '',
        city: '',
        country: ''
    });

    const [initialFormData, setInitialFormData] = useState(formData);
    
    const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
    const [isGeneratingRecovery, setIsGeneratingRecovery] = useState(false);
    const [hasRecoveryCode, setHasRecoveryCode] = useState(false);
    const [isSendingReset, setIsSendingReset] = useState(false);

    const handleSendPasswordReset = async () => {
        setIsSendingReset(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) throw new Error('No email found for this user.');

            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/update-password`,
            });
            if (error) throw error;
            showToast('Password reset email sent. Please check your inbox.', 'success');
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to send password reset email.', 'error');
        } finally {
            setIsSendingReset(false);
        }
    };

    const handleGenerateRecoveryCode = async () => {
        setIsGeneratingRecovery(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('generate_recovery_code');
            if (error) throw error;
            setRecoveryCode(data);
            setHasRecoveryCode(true);
            showToast('Recovery code generated successfully. Please save it immediately.', 'success');
        } catch (err) {
            showToast(getErrorMessage(err) || 'Failed to generate recovery code.', 'error');
        } finally {
            setIsGeneratingRecovery(false);
        }
    };




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

    const fetchData = useCallback(async () => {
        if (!activeAccount || !user) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('get_account_settings', {
                p_account_id: activeAccount.id
            });

            if (error) throw error;

            const acc = data?.account || {};
            const info = acc.info || {};
            const profile = info.profile || {};
            const contact = info.contact || {};
            const phone = contact.phone || {};
            const ba = info.billing_address || {};

            const newValues = {
                name: profile.name || acc.name || '',
                secondary_contact: phone.secondary || info.secondary_contact || '',
                description: profile.description || info.description || '',
                support_email: contact.email || info.contact_email || '',
                primary_contact: phone.primary || info.phone_number || '',
                address_line: ba.line1 || ba.line || '',
                town: ba.city || ba.town || '',
                city: ba.city || '',
                country: ba.country || acc.country_code || ''
            };

            setFormData(newValues);
            setInitialFormData(newValues);
            setWallets((data.wallets || []).map((w: AccountWallet) => ({ ...w, id: w.currency })));

            const { data: hasCode } = await supabase.schema('api').rpc('has_recovery_code');
            setHasRecoveryCode(!!hasCode);
        } catch (err) {
            showToast(getErrorMessage(err) || 'Failed to sync your account settings.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, user, supabase, showToast]);

    useEffect(() => {
        if (!isOrgLoading && activeAccount && user && !authLoading) {
            fetchData();
        }
    }, [isOrgLoading, activeAccount, user, authLoading, fetchData]);

    const handleTabChange = (newTab: string) => {
        if (isDirty && activeTab !== newTab) {
            setPendingTab(newTab);
            return;
        }
        confirmTabChange(newTab);
    };

    const confirmTabChange = (newTab: string) => {
        setActiveTab(newTab as 'account' | 'team' | 'billing' | 'danger-zone');
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
        if (!formData.name || !formData.support_email || !formData.primary_contact || !formData.city || !formData.country) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }
        setIsSaving(true);
        try {
            const { error } = await supabase.schema('api').rpc('update_account_settings', {
                p_account_id: activeAccount.id,
                p_display_name: formData.name,
                p_info: {
                    profile: {
                        name: formData.name,
                        description: formData.description
                    },
                    contact: {
                        email: formData.support_email,
                        phone: {
                            primary: formData.primary_contact,
                            secondary: formData.secondary_contact
                        }
                    },
                    billing_address: {
                        line1: formData.address_line,
                        city: formData.city,
                        country: formData.country
                    }
                }
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
            const { error: accountError } = await supabase.schema('api').rpc('deactivate_ads_account', {
                p_account_id: activeAccount.id
            });
            if (accountError) throw accountError;

            // 2. Shred the entire user data (GDPR Compliance)
            const { error: shredError } = await supabase.schema('api').rpc('shred_user_data');
            if (shredError) throw shredError;

            showToast('Account deactivated successfully.', 'success');
            setIsDeactivateModalOpen(false);
            if (refreshAccounts) await refreshAccounts();
            
            // Log them out and redirect home since their identity is now destroyed
            await supabase.auth.signOut();
            router.push('/');
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to deactivate account.', 'error');
        } finally {
            setIsDeactivating(false);
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

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className={adminStyles.tabsHeaderRow}>
                    <TabsList>
                        <TabsTrigger value="account">Account</TabsTrigger>
                        <TabsTrigger value="team">Team Members</TabsTrigger>
                        <TabsTrigger value="billing">Billing & Wallet</TabsTrigger>
                        <TabsTrigger value="danger-zone">Danger Zone</TabsTrigger>
                    </TabsList>
                </div>

                <div style={{ marginTop: '24px' }}>
                    <TabsContent value="account">
                        <div className={adminStyles.pageCard}>
                            {activeAccount && <KycStatusCard accountId={activeAccount.id} />}
                            <h2 className={adminStyles.sectionTitle}>Account Profile</h2>
                            <div className={adminStyles.formGrid}>
                                <div className={adminStyles.inputGroup}>
                                    <label className={adminStyles.label}>Account Name <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                    <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Acme Ads" />
                                </div>
                                <div className={adminStyles.inputGroup}>
                                    <label className={adminStyles.label}>Support Email <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                    <Input type="email" name="support_email" value={formData.support_email} onChange={handleInputChange} placeholder="ads-support@organization.com" />
                                </div>
                                 <div className={adminStyles.inputGroup}>
                                    <label className={adminStyles.label}>Primary Contact <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                    <Input name="primary_contact" value={formData.primary_contact} onChange={handleInputChange} placeholder="+000..." />
                                </div>
                                <div className={adminStyles.inputGroup}>
                                    <label className={adminStyles.label}>Secondary Contact</label>
                                    <Input name="secondary_contact" value={formData.secondary_contact} onChange={handleInputChange} placeholder="+000... or alternative email" />
                                </div>
                                <div style={{ gridColumn: '1 / -1', margin: '12px 0', borderBottom: '1px solid var(--color-interface-outline)' }} />

                                <div className={adminStyles.inputGroup}>
                                    <label className={adminStyles.label}>Address Line</label>
                                    <Input name="address_line" value={formData.address_line} onChange={handleInputChange} placeholder="e.g. 123 Event Street" />
                                </div>
                                <div className={adminStyles.inputGroup}>
                                    <label className={adminStyles.label}>Town</label>
                                    <Input name="town" value={formData.town} onChange={handleInputChange} placeholder="e.g. Westlands" />
                                </div>
                                <div className={adminStyles.inputGroup}>
                                    <label className={adminStyles.label}>City <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                    <Input name="city" value={formData.city} onChange={handleInputChange} placeholder="e.g. Nairobi" />
                                </div>
                                <div className={adminStyles.inputGroup}>
                                    <label className={adminStyles.label}>Country <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                    <CountrySelect 
                                        value={formData.country} 
                                        onChange={(val) => setFormData(prev => ({ ...prev, country: val }))} 
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="team">
                        <div className={adminStyles.pageCard}>
                            <MemberTable />
                        </div>
                    </TabsContent>

                    <TabsContent value="billing">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className={adminStyles.pageCard}>
                                <h2 className={adminStyles.sectionTitle}>Payment Methods</h2>
                                {activeAccount ? (
                                    <PaymentMethodsManager accountId={activeAccount.id} />
                                ) : (
                                    <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Select an organization to manage payment methods.</div>
                                )}
                            </div>

                            <WalletManager 
                                accountId={activeAccount?.id || ''} 
                                wallets={wallets} 
                                isLoading={isLoading} 
                                onRefresh={fetchData} 
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="danger-zone">
                        <div className={adminStyles.pageCard} style={{ marginBottom: '24px' }}>
                            <h2 className={adminStyles.sectionTitle} style={{ color: '#ffffff' }}>Account Security</h2>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
                                <div>
                                    <h3 className={adminStyles.label} style={{ marginBottom: '8px', fontWeight: 500, fontSize: '15px' }}>
                                        Generate Recovery Code
                                    </h3>
                                    <p className={adminStyles.label} style={{ margin: 0, fontWeight: 400, opacity: 0.8 }}>
                                        Generate a cryptographic recovery code for your personal identity. If you lose access to your primary authentication methods, this is the only way to recover your encrypted data.
                                    </p>
                                </div>
                                <div style={{ flexShrink: 0 }}>
                                    <Button
                                        variant="secondary"
                                        onClick={handleGenerateRecoveryCode}
                                        isLoading={isGeneratingRecovery}
                                        disabled={hasRecoveryCode}
                                    >
                                        {hasRecoveryCode ? 'Recovery Code Generated' : 'Generate Recovery Code'}
                                    </Button>
                                </div>
                            </div>

                            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-interface-outline)' }}>
                                <MfaManager />
                            </div>

                            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-interface-outline)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
                                    <div>
                                        <h3 className={adminStyles.label} style={{ marginBottom: '8px', fontWeight: 500, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                                            Password Reset
                                        </h3>
                                        <p className={adminStyles.label} style={{ margin: 0, fontWeight: 400, opacity: 0.8, color: 'var(--color-text-primary)' }}>
                                            Receive an email with a secure link to update your account password.
                                        </p>
                                    </div>
                                    <div style={{ flexShrink: 0 }}>
                                        <Button
                                            variant="secondary"
                                            onClick={handleSendPasswordReset}
                                            isLoading={isSendingReset}
                                        >
                                            Reset Password
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-interface-outline)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
                                    <div>
                                        <h3 className={adminStyles.label} style={{ marginBottom: '8px', fontWeight: 500, fontSize: '15px', color: 'var(--color-interface-error)' }}>
                                            Danger Zone
                                        </h3>
                                        <p className={adminStyles.label} style={{ margin: 0, fontWeight: 400, opacity: 0.8, color: 'var(--color-text-primary)' }}>
                                            Deactivating your ads account pauses all active campaigns indefinitely. This action cannot be undone from the dashboard.
                                        </p>
                                    </div>
                                    <div style={{ flexShrink: 0 }}>
                                        <Button
                                            variant="danger"
                                            onClick={() => setIsDeactivateModalOpen(true)}
                                            isLoading={isDeactivating}
                                        >
                                            Deactivate Ads Account
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Modal
                            isOpen={!!recoveryCode}
                            onClose={() => setRecoveryCode(null)}
                            title="Your Recovery Code"
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                                    Please write this down immediately. It will not be shown again.
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: 'var(--color-background-surface)', borderRadius: '4px', border: '1px solid var(--color-interface-outline)' }}>
                                    <code style={{ flex: 1, fontSize: '18px', letterSpacing: '2px', textAlign: 'center' }}>
                                        {recoveryCode}
                                    </code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(recoveryCode || '');
                                            showToast('Recovery code copied to clipboard!', 'success');
                                        }}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)'
                                        }}
                                        title="Copy to clipboard"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                    </button>
                                </div>
                                <Button variant="primary" onClick={() => setRecoveryCode(null)}>
                                    I have saved my recovery code
                                </Button>
                            </div>
                        </Modal>


                    </TabsContent>
                </div>
            </Tabs>

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
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}><Spinner label="Loading settings..." /></div>}>
            <AdsSettingsContent />
        </Suspense>
    );
}
