"use client";

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { sanitizeInput } from '@/utils/sanitization';
import MemberTable from '@/components/features/members/MemberTable';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import tabStyles from '@/components/shared/Tabs.module.css';
import localStyles from '../page.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import CountrySelect from '@/components/shared/CountrySelect';
import Input from '@/components/shared/Input';
import Textarea from '@/components/shared/Textarea';
import FormRow from '@/components/shared/FormRow';

type Tab = 'account' | 'team';

function SettingsContent() {
    const { showToast } = useToast();
    const { activeAccount, refreshAccounts } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialTab = (searchParams.get('tab') as Tab) || 'account';
    const [activeTab, setActiveTab] = useState<Tab>(
        ['account', 'team'].includes(initialTab) ? initialTab : 'account'
    );
    const [pendingTab, setPendingTab] = useState<string | null>(null);
    const [teamMissingPhone, setTeamMissingPhone] = useState(false);

    useEffect(() => {
        const tab = searchParams.get('tab') as Tab;
        if (tab && ['account', 'team'].includes(tab)) {
            setActiveTab(tab);
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
        setActiveTab(newTab as Tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
        setPendingTab(null);
    };

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        support_email: '',
        primary_contact: '',
        secondary_contact: '',
        description: '',
        address_line: '',
        town: '',
        city: '',
        country: ''
    });
    const [initialFormData, setInitialFormData] = useState(formData);

    const fetchData = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            // Retrieve using generic account settings RPC
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
                support_email: contact.email || info.contact_email || info.support_email || '',
                primary_contact: phone.primary || info.phone_number || '',
                secondary_contact: phone.secondary || info.secondary_contact || '',
                description: profile.description || info.description || '',
                address_line: ba.line1 || ba.line || '',
                town: ba.city || ba.town || '',
                city: ba.city || '',
                country: ba.country || acc.country_code || ''
            };

            setFormData(newValues);
            setInitialFormData(newValues);
        } catch (err) {
            showToast(getErrorMessage(err) || 'Failed to sync platform administrative settings.', 'error');
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
        if (!formData.name) {
            showToast('Account name is required.', 'error');
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

            showToast('Platform settings saved successfully.', 'success');
            setInitialFormData(formData);
            if (refreshAccounts) await refreshAccounts();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to update platform settings.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const settingsContainerRef = useRef<HTMLDivElement>(null);

    // Autofocus logic on tab switch
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

    if (isLoading) {
        return <div className={localStyles.loading}>Loading Settings...</div>;
    }

    return (
        <div className={localStyles.container}>
            <PageHeader
                title="Platform Administration Settings"
                subtitle="Configure details, local contact addresses, and manage regional administrative members."
                actionLabel={isSaving ? "Saving..." : "Save Settings"}
                onActionClick={handleSave}
                actionIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline></svg>}
            />

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className={localStyles.tabsHeaderRow} style={{ marginTop: '16px' }}>
                    <TabsList>
                        <TabsTrigger value="account">Account Details</TabsTrigger>
                        <TabsTrigger value="team" className={teamMissingPhone ? tabStyles.tabError : undefined}>Team Members</TabsTrigger>
                    </TabsList>
                </div>

                <div style={{ marginTop: '24px' }} ref={settingsContainerRef}>
                    <TabsContent value="account">
                        <div className={localStyles.pageCard}>
                            <h2 className={localStyles.sectionTitle}>Administrative Profile</h2>
                            <p style={{ fontSize: '13px', opacity: 0.6, marginBottom: '20px' }}>
                                Manage profile fields and billing details for your active administrative country account.
                            </p>

                            <div className={localStyles.formGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                                <FormRow label="Account Name" styles={localStyles}>
                                    <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Kenya Admin Office" />
                                </FormRow>
                                <FormRow label="Support Email" styles={localStyles}>
                                    <Input type="email" name="support_email" value={formData.support_email} onChange={handleInputChange} placeholder="admin-ke@platform.com" />
                                </FormRow>
                                <FormRow label="Primary Contact" styles={localStyles}>
                                    <Input name="primary_contact" value={formData.primary_contact} onChange={handleInputChange} placeholder="e.g. +254 700 000 000" />
                                </FormRow>
                                <FormRow label="Secondary Contact" styles={localStyles}>
                                    <Input name="secondary_contact" value={formData.secondary_contact} onChange={handleInputChange} placeholder="e.g. Alternative email/phone" />
                                </FormRow>

                                <div style={{ gridColumn: '1 / -1', margin: '12px 0', borderBottom: '1px solid var(--color-interface-outline)' }} />

                                <FormRow label="Address Line" styles={localStyles}>
                                    <Input name="address_line" value={formData.address_line} onChange={handleInputChange} placeholder="e.g. Plaza Suite 4B, 5th Avenue" />
                                </FormRow>
                                <FormRow label="Town" styles={localStyles}>
                                    <Input name="town" value={formData.town} onChange={handleInputChange} placeholder="e.g. Kilimani" />
                                </FormRow>
                                <FormRow label="City" styles={localStyles}>
                                    <Input name="city" value={formData.city} onChange={handleInputChange} placeholder="e.g. Nairobi" />
                                </FormRow>
                                <FormRow label="Country Jurisdiction" styles={localStyles}>
                                    <CountrySelect
                                        value={formData.country}
                                        onChange={(val) => setFormData(prev => ({ ...prev, country: val }))}
                                    />
                                </FormRow>

                                <FormRow label="Office Description / Internal Notes" styles={localStyles} style={{ gridColumn: '1 / -1' }}>
                                    <Textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Describe the focus or operational responsibilities of this regional office..." rows={3} />
                                </FormRow>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="team">
                        <div className={localStyles.pageCard} style={{ background: 'var(--color-interface-surface)', border: '1px solid var(--color-interface-border-subtle)', padding: '24px', borderRadius: '12px' }}>
                            <MemberTable onMissingPhoneChange={setTeamMissingPhone} />
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
        </div>
    );
}

export default function AdminSettingsPage() {
    return (
        <Suspense fallback={<div className={localStyles.loading}>Loading Settings...</div>}>
            <SettingsContent />
        </Suspense>
    );
}
