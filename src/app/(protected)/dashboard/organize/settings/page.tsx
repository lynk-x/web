"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { sanitizeInput } from '@/utils/sanitization';
import MemberTable from '@/components/features/members/MemberTable';
import { MfaManager } from '@/components/MfaManager';
import PaymentMethodsManager from '@/components/features/members/PaymentMethodsManager';
import WalletsTable from '@/components/features/finance/WalletsTable';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import KycStatusCard from '@/components/dashboard/KycStatusCard';
import ProductTour from '@/components/dashboard/ProductTour';
import CountrySelect from '@/components/shared/CountrySelect';
import Input from '@/components/shared/Input';
import Select from '@/components/shared/Select';
import Button from '@/components/shared/Button';
import Textarea from '@/components/shared/Textarea';
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
        setActiveTab(newTab as 'account' | 'team' | 'billing' | 'danger-zone');
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
        secondary_contact: '',
        description: '',
        support_email: '',
        primary_contact: '',
        address_line: '',
        town: '',
        city: '',
        country: ''
    });
    const [wallets, setWallets] = useState<AccountWallet[]>([]);
    const [initialFormData, setInitialFormData] = useState(formData);
    
    const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
    const [isGeneratingRecovery, setIsGeneratingRecovery] = useState(false);

    const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
    const [newWalletCurrency, setNewWalletCurrency] = useState('USD');
    const [isAddingWallet, setIsAddingWallet] = useState(false);

    const handleGenerateRecoveryCode = async () => {
        setIsGeneratingRecovery(true);
        try {
            const { data, error } = await supabase.rpc('generate_recovery_code');
            if (error) throw error;
            setRecoveryCode(data);
            showToast('Recovery code generated successfully. Please save it immediately.', 'success');
        } catch (err) {
            showToast(getErrorMessage(err) || 'Failed to generate recovery code.', 'error');
        } finally {
            setIsGeneratingRecovery(false);
        }
    };

    const handleAddWallet = async () => {
        if (!activeAccount) return;
        setIsAddingWallet(true);
        try {
            const { error } = await supabase.rpc('create_wallet', {
                p_currency: newWalletCurrency
            });
            if (error) throw error;
            showToast(`Successfully created ${newWalletCurrency} wallet.`, 'success');
            setIsAddWalletOpen(false);
            fetchData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to create wallet.', 'error');
        } finally {
            setIsAddingWallet(false);
        }
    };

    const fetchData = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const { data: settings, error } = await supabase.rpc('get_account_settings', {
                p_account_id: activeAccount.id
            });

            if (error) throw error;

            const profile = settings?.profile || {};
            const ba = typeof profile.billing_address === 'string' ? {} : (profile.billing_address || {});
            const newValues = {
                name: settings?.account?.name || '',
                secondary_contact: profile.secondary_contact || '',
                description: profile.description || '',
                support_email: profile.contact_email || '',
                primary_contact: profile.phone_number || '',
                address_line: ba.line || (typeof profile.billing_address === 'string' ? profile.billing_address : ''),
                town: ba.town || '',
                city: ba.city || '',
                country: ba.country || settings?.account?.country_code || ''
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
        if (!formData.name || !formData.support_email || !formData.primary_contact || !formData.city || !formData.country) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }
        setIsSaving(true);
        try {
            const { error } = await supabase.rpc('update_organizer_settings', {
                p_account_id: activeAccount.id,
                p_display_name: formData.name,
                p_info: {
                    legal_name: formData.name,
                    contact_email: formData.support_email,
                    phone_number: formData.primary_contact,
                    description: formData.description,
                    secondary_contact: formData.secondary_contact,
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
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to update settings.', 'error');
        } finally {
            setIsSaving(false);
        }
    };


    const handleDeleteAccount = async () => {
        if (!activeAccount) return;
        try {
            // 1. Deactivate the specific business account
            const { error: accountError } = await supabase
                .schema('api' as any)
                .from('v1_accounts')
                .delete()
                .eq('id', activeAccount.id);

            if (accountError) throw accountError;

            // 2. Shred the entire user data (GDPR Compliance)
            const { error: shredError } = await supabase.rpc('shred_user_data');
            if (shredError) throw shredError;

            showToast('Account successfully deactivated and data shredded.', 'success');
            setIsDeleteModalOpen(false);
            
            // Log them out and redirect home since their identity is now destroyed
            await supabase.auth.signOut();
            router.push('/');
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

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className={adminStyles.tabsHeaderRow}>
                    <TabsList>
                        <TabsTrigger value="account">Account</TabsTrigger>
                        <TabsTrigger value="team">Team Members</TabsTrigger>
                        <TabsTrigger value="billing">Billing & Wallet</TabsTrigger>
                        <TabsTrigger value="danger-zone">Danger Zone</TabsTrigger>
                    </TabsList>
                </div>

                <div style={{ marginTop: '24px' }} ref={settingsContainerRef}>
                    <TabsContent value="account">
                        <div className={adminStyles.pageCard}>
                            {activeAccount && (
                                <div className="tour-settings-kyc">
                                    <KycStatusCard accountId={activeAccount.id} />
                                </div>
                            )}
                            <h2 className={adminStyles.sectionTitle}>Account Profile</h2>
                            <div className={adminStyles.formGrid}>
                                <div className={adminStyles.inputGroup}>
                                    <label className={adminStyles.label}>Organization Name <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                    <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Acme Events" />
                                </div>
                                <div className={adminStyles.inputGroup}>
                                    <label className={adminStyles.label}>Support Email <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                    <Input type="email" name="support_email" value={formData.support_email} onChange={handleInputChange} placeholder="support@organization.com" />
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

                            <div className={adminStyles.pageCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h2 className={adminStyles.sectionTitle} style={{ margin: 0 }}>Account Wallets</h2>
                                    <Button variant="secondary" onClick={() => setIsAddWalletOpen(true)}>Add Wallet</Button>
                                </div>
                                <WalletsTable data={wallets} isLoading={isLoading} accountId={activeAccount?.id} onRefresh={fetchData} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="danger-zone">
                        <div className={adminStyles.pageCard} style={{ marginBottom: '24px' }}>
                            <h2 className={adminStyles.sectionTitle} style={{ color: 'var(--color-interface-warning)' }}>Account Security</h2>
                            
                            <MfaManager />

                            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-interface-outline)' }}>
                                <h3 className={adminStyles.label} style={{ marginBottom: '16px', fontWeight: 500, fontSize: '15px' }}>
                                    Generate Recovery Code
                                </h3>
                            <p className={adminStyles.label} style={{ marginBottom: '16px', fontWeight: 400, opacity: 0.8 }}>
                                Generate a cryptographic recovery code for your Account Data. If you lose access to your primary authentication methods, this is the only way to recover your encrypted data.
                            </p>
                            {recoveryCode ? (
                                <div style={{ padding: '16px', backgroundColor: 'var(--color-background-elevated)', borderRadius: '8px', border: '1px solid var(--color-interface-outline)', marginBottom: '16px' }}>
                                    <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-text-primary)' }}>Your Recovery Code:</p>
                                    <code style={{ display: 'block', padding: '12px', marginTop: '8px', backgroundColor: 'var(--color-background-surface)', borderRadius: '4px', fontSize: '18px', letterSpacing: '2px', textAlign: 'center' }}>
                                        {recoveryCode}
                                    </code>
                                    <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: 'var(--color-interface-error)' }}>
                                        Please write this down immediately. It will not be shown again.
                                    </p>
                                </div>
                            ) : (
                                <Button
                                    variant="secondary"
                                    onClick={handleGenerateRecoveryCode}
                                    isLoading={isGeneratingRecovery}
                                >
                                    Generate Recovery Code
                                </Button>
                            )}
                            </div>
                        </div>

                        <div className={adminStyles.pageCard}>
                            <h2 className={adminStyles.sectionTitle} style={{ color: 'var(--color-interface-error)' }}>Danger Zone</h2>
                            <p className={adminStyles.label} style={{ marginBottom: '16px', fontWeight: 400, opacity: 0.8 }}>
                                Deactivates your organizer account and removes it from public listings. This action cannot be easily undone.
                            </p>
                            <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>Deactivate Account</Button>
                        </div>
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
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteAccount}
                title="Deactivate Organizer Account?"
                message="Your organization will be removed from public listings. Ongoing events may be affected. Contact support to reverse this."
                confirmLabel="Deactivate"
                variant="danger"
                confirmText="DEACTIVATE"
            />

            <ConfirmationModal
                isOpen={isAddWalletOpen}
                onClose={() => setIsAddWalletOpen(false)}
                onConfirm={handleAddWallet}
                title="Create New Wallet"
                message="Select the currency for your new wallet. Note that your organization's KYC verification tier dictates maximum limits for specific currencies."
                confirmLabel={isAddingWallet ? "Creating..." : "Create Wallet"}
                variant="default"
            >
                <div style={{ marginTop: '16px' }}>
                    <Select
                        label="Currency"
                        options={[
                            { value: 'USD', label: 'USD - US Dollar' },
                            { value: 'KES', label: 'KES - Kenyan Shilling' },
                            { value: 'GBP', label: 'GBP - British Pound' },
                            { value: 'EUR', label: 'EUR - Euro' }
                        ]}
                        value={newWalletCurrency}
                        onChange={(e) => setNewWalletCurrency(e.target.value)}
                    />
                </div>
            </ConfirmationModal>

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
