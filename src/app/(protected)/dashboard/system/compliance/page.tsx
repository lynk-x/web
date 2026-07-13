"use client";

/**
 * Global Compliance Administration Page.
 * Governs supported countries and country-scoped KYC policy (document
 * requirements, money-movement limits, and vendor availability). Tax
 * jurisdictions live under Global Finance's "Tax Rates" tab.
 */

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import RegionsTab from '@/components/system/settings/RegionsTab';
import KycLimitsTable from '@/components/system/compliance/KycLimitsTable';
import KycRequirementsTable from '@/components/system/compliance/KycRequirementsTable';
import KycProvidersTable from '@/components/system/compliance/KycProvidersTable';
import TableToolbar from '@/components/shared/TableToolbar';
import Modal from '@/components/shared/Modal';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { KycLimit, KycRequirement, KycProvider } from '@/types/admin';
import { useDebounce } from '@/hooks/useDebounce';

const KYC_ACCOUNT_TYPES = ['organizer', 'advertiser', 'attendee'] as const;
const KYC_TIERS = ['tier_1_basic', 'tier_2_verified', 'tier_3_advanced'] as const;

interface KycLimitsForm {
    country_code: string;
    account_type: string;
    tier_slug: string;
    currency: string;
    daily_transfer: string;
    daily_withdrawal: string;
    auto_payout_max: string;
    aml_flag_threshold: string;
}

const emptyKycLimitsForm: KycLimitsForm = {
    country_code: 'XX',
    account_type: 'organizer',
    tier_slug: 'tier_1_basic',
    currency: 'USD',
    daily_transfer: '',
    daily_withdrawal: '',
    auto_payout_max: '',
    aml_flag_threshold: '',
};

interface KycRequirementStepDraft {
    id: string;
    type: 'file' | 'text';
    label: string;
    subtype: string;
    mandatory: boolean;
    hint: string;
}

interface KycRequirementsForm {
    country_code: string;
    account_type: string;
    tier_slug: string;
    steps: KycRequirementStepDraft[];
}

const emptyKycRequirementsForm: KycRequirementsForm = {
    country_code: 'XX',
    account_type: 'organizer',
    tier_slug: 'tier_1_basic',
    steps: [],
};

function newStepDraft(): KycRequirementStepDraft {
    return {
        id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'file',
        label: '',
        subtype: '',
        mandatory: true,
        hint: '',
    };
}

function GlobalComplianceContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'kyc-limits');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [countries, setCountries] = useState<{ code: string, name: string }[]>([]);
    const itemsPerPage = 10;

    const [kycLimits, setKycLimits] = useState<KycLimit[]>([]);
    const [isKycLimitsModalOpen, setIsKycLimitsModalOpen] = useState(false);
    const [editingKycLimit, setEditingKycLimit] = useState<KycLimit | null>(null);
    const [kycLimitsForm, setKycLimitsForm] = useState<KycLimitsForm>(emptyKycLimitsForm);
    const [kycLimitsCurrentPage, setKycLimitsCurrentPage] = useState(1);

    const [kycRequirements, setKycRequirements] = useState<KycRequirement[]>([]);
    const [isKycRequirementsModalOpen, setIsKycRequirementsModalOpen] = useState(false);
    const [editingKycRequirement, setEditingKycRequirement] = useState<KycRequirement | null>(null);
    const [kycRequirementsForm, setKycRequirementsForm] = useState<KycRequirementsForm>(emptyKycRequirementsForm);
    const [kycRequirementsCurrentPage, setKycRequirementsCurrentPage] = useState(1);

    const [kycProviders, setKycProviders] = useState<KycProvider[]>([]);
    const [kycProvidersCurrentPage, setKycProvidersCurrentPage] = useState(1);

    // 'XX' is deliberately excluded from api.v1_countries (it must never show
    // up in a normal user-facing country selector), but the KYC tabs need to
    // let an admin target the global-default row — so it's prepended
    // client-side here, not fetched from the DB.
    const kycCountryOptions = useMemo(
        () => [{ code: 'XX', name: 'Global (all countries)' }, ...countries],
        [countries]
    );

    const debouncedSearch = useDebounce(searchTerm, 300);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', value);
        router.push(`${pathname}?${params.toString()}`);
    };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'kyc-limits') {
                const { data, error } = await supabase
                    .schema('api')
                    .from('v1_kyc_limits')
                    .select('*')
                    .order('country_code')
                    .order('account_type')
                    .order('tier_slug');
                if (error) throw error;

                const countryNameByCode = new Map(countries.map((c) => [c.code, c.name]));
                setKycLimits((data || []).map((l: Omit<KycLimit, 'country_name'>) => ({
                    ...l,
                    country_name: l.country_code === 'XX' ? 'Global default' : (countryNameByCode.get(l.country_code) || l.country_code),
                })));
            } else if (activeTab === 'kyc-requirements') {
                const { data, error } = await supabase
                    .schema('api')
                    .from('v1_kyc_requirements')
                    .select('*')
                    .order('country_code')
                    .order('account_type')
                    .order('tier_slug');
                if (error) throw error;

                const countryNameByCode = new Map(countries.map((c) => [c.code, c.name]));
                setKycRequirements((data || []).map((r: Omit<KycRequirement, 'country_name'>) => ({
                    ...r,
                    country_name: r.country_code === 'XX' ? 'Global default' : (countryNameByCode.get(r.country_code) || r.country_code),
                })));
            } else if (activeTab === 'kyc-providers') {
                const { data, error } = await supabase
                    .schema('api')
                    .from('v1_kyc_providers')
                    .select('*')
                    .order('display_name');
                if (error) throw error;
                setKycProviders(data || []);
            }
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, supabase, showToast, countries]);

    useEffect(() => {
        fetchData();
    }, [activeTab, debouncedSearch, fetchData]);

    useEffect(() => {
        setKycLimitsCurrentPage(1);
        setKycRequirementsCurrentPage(1);
        setKycProvidersCurrentPage(1);
    }, [activeTab, debouncedSearch]);

    useEffect(() => {
        const fetchCountries = async () => {
            const { data } = await supabase.schema('api').from('v1_countries').select('code, display_name').order('display_name');
            if (data) setCountries(data.map((c: any) => ({ code: c.code, name: c.display_name })));
        };
        fetchCountries();
    }, [supabase]);

    const filteredKycLimits = kycLimits.filter(l =>
        (l.country_name || l.country_code).toLowerCase().includes(searchTerm.toLowerCase())
        || l.tier_slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const kycLimitsTotalPages = Math.max(1, Math.ceil(filteredKycLimits.length / itemsPerPage));
    const paginatedKycLimits = filteredKycLimits.slice((kycLimitsCurrentPage - 1) * itemsPerPage, kycLimitsCurrentPage * itemsPerPage);

    /** Empty string in the form means "inherit the global default" -> NULL, not 0. */
    const parseLimitInput = (value: string): number | null => (value.trim() === '' ? null : Number(value));

    const handleSaveKycLimit = async () => {
        try {
            const { error } = await supabase.schema('api').rpc('admin_upsert_kyc_limits', {
                p_id: editingKycLimit?.id ?? null,
                p_country_code: kycLimitsForm.country_code,
                p_account_type: kycLimitsForm.account_type,
                p_tier_slug: kycLimitsForm.tier_slug,
                p_currency: kycLimitsForm.currency,
                p_daily_transfer: parseLimitInput(kycLimitsForm.daily_transfer),
                p_daily_withdrawal: parseLimitInput(kycLimitsForm.daily_withdrawal),
                p_auto_payout_max: parseLimitInput(kycLimitsForm.auto_payout_max),
                p_aml_flag_threshold: parseLimitInput(kycLimitsForm.aml_flag_threshold),
            });
            if (error) throw error;
            showToast(editingKycLimit ? 'KYC limits updated successfully' : 'KYC limits created successfully', 'success');
            setIsKycLimitsModalOpen(false);
            fetchData();
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        }
    };

    const filteredKycRequirements = kycRequirements.filter(r =>
        (r.country_name || r.country_code).toLowerCase().includes(searchTerm.toLowerCase())
        || r.tier_slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const kycRequirementsTotalPages = Math.max(1, Math.ceil(filteredKycRequirements.length / itemsPerPage));
    const paginatedKycRequirements = filteredKycRequirements.slice((kycRequirementsCurrentPage - 1) * itemsPerPage, kycRequirementsCurrentPage * itemsPerPage);

    const filteredKycProviders = kycProviders.filter(p =>
        p.display_name.toLowerCase().includes(searchTerm.toLowerCase())
        || p.provider_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const kycProvidersTotalPages = Math.max(1, Math.ceil(filteredKycProviders.length / itemsPerPage));
    const paginatedKycProviders = filteredKycProviders.slice((kycProvidersCurrentPage - 1) * itemsPerPage, kycProvidersCurrentPage * itemsPerPage);

    const handleSaveKycRequirement = async () => {
        try {
            const required_steps = kycRequirementsForm.steps.map(({ id, type, label, subtype, mandatory, hint }) => ({
                id,
                type,
                label,
                ...(subtype.trim() ? { subtype: subtype.trim() } : {}),
                mandatory,
                ...(hint.trim() ? { hint: hint.trim() } : {}),
            }));

            const { error } = await supabase.schema('api').rpc('admin_upsert_kyc_requirements', {
                p_id: editingKycRequirement?.id ?? null,
                p_country_code: kycRequirementsForm.country_code,
                p_account_type: kycRequirementsForm.account_type,
                p_tier_slug: kycRequirementsForm.tier_slug,
                p_required_steps: required_steps,
            });
            if (error) throw error;
            showToast(editingKycRequirement ? 'KYC requirements updated successfully' : 'KYC requirements created successfully', 'success');
            setIsKycRequirementsModalOpen(false);
            fetchData();
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        }
    };

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Global Compliance & Territories"
                subtitle="Manage supported countries and country-scoped KYC policy — document requirements and money-movement limits."
            />

            <TableToolbar
                searchPlaceholder="Search regions or KYC parameters..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            />

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className={adminStyles.tabsHeaderRow} style={{ borderBottom: 'none', marginTop: '16px' }}>
                    <TabsList>
                        <TabsTrigger value="kyc-limits">KYC Limits</TabsTrigger>
                        <TabsTrigger value="kyc-requirements">KYC Requirements</TabsTrigger>
                        <TabsTrigger value="kyc-providers">KYC Providers</TabsTrigger>
                        <TabsTrigger value="regions">Supported Countries</TabsTrigger>
                    </TabsList>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activeTab === 'kyc-limits' && (
                            <button className={adminStyles.btnPrimary} onClick={() => {
                                setEditingKycLimit(null);
                                setKycLimitsForm(emptyKycLimitsForm);
                                setIsKycLimitsModalOpen(true);
                            }}>
                                + Add KYC Limits
                            </button>
                        )}
                        {activeTab === 'kyc-requirements' && (
                            <button className={adminStyles.btnPrimary} onClick={() => {
                                setEditingKycRequirement(null);
                                setKycRequirementsForm(emptyKycRequirementsForm);
                                setIsKycRequirementsModalOpen(true);
                            }}>
                                + Add KYC Requirements
                            </button>
                        )}
                    </div>
                </div>

                <TabsContent value="kyc-limits">
                    <KycLimitsTable
                        data={paginatedKycLimits}
                        isLoading={isLoading}
                        onUpdate={fetchData}
                        currentPage={kycLimitsCurrentPage}
                        totalPages={kycLimitsTotalPages}
                        onPageChange={setKycLimitsCurrentPage}
                        onEdit={(limit) => {
                            setEditingKycLimit(limit);
                            setKycLimitsForm({
                                country_code: limit.country_code,
                                account_type: limit.account_type,
                                tier_slug: limit.tier_slug,
                                currency: limit.currency,
                                daily_transfer: limit.daily_transfer === null ? '' : String(limit.daily_transfer),
                                daily_withdrawal: limit.daily_withdrawal === null ? '' : String(limit.daily_withdrawal),
                                auto_payout_max: limit.auto_payout_max === null ? '' : String(limit.auto_payout_max),
                                aml_flag_threshold: limit.aml_flag_threshold === null ? '' : String(limit.aml_flag_threshold),
                            });
                            setIsKycLimitsModalOpen(true);
                        }}
                    />
                </TabsContent>

                <TabsContent value="kyc-requirements">
                    <KycRequirementsTable
                        data={paginatedKycRequirements}
                        isLoading={isLoading}
                        onUpdate={fetchData}
                        currentPage={kycRequirementsCurrentPage}
                        totalPages={kycRequirementsTotalPages}
                        onPageChange={setKycRequirementsCurrentPage}
                        onEdit={(req) => {
                            setEditingKycRequirement(req);
                            setKycRequirementsForm({
                                country_code: req.country_code,
                                account_type: req.account_type,
                                tier_slug: req.tier_slug,
                                steps: req.required_steps.map((s) => ({
                                    id: s.id || newStepDraft().id,
                                    type: (s.type as 'file' | 'text') || 'file',
                                    label: s.label || '',
                                    subtype: s.subtype || '',
                                    mandatory: s.mandatory ?? true,
                                    hint: s.hint || '',
                                })),
                            });
                            setIsKycRequirementsModalOpen(true);
                        }}
                    />
                </TabsContent>

                <TabsContent value="kyc-providers">
                    <KycProvidersTable
                        data={paginatedKycProviders}
                        isLoading={isLoading}
                        onUpdate={fetchData}
                        currentPage={kycProvidersCurrentPage}
                        totalPages={kycProvidersTotalPages}
                        onPageChange={setKycProvidersCurrentPage}
                    />
                </TabsContent>

                <TabsContent value="regions">
                    <RegionsTab searchTerm={searchTerm} />
                </TabsContent>
            </Tabs>


            {/* KYC Limits Form Modal */}
            <Modal
                isOpen={isKycLimitsModalOpen}
                onClose={() => setIsKycLimitsModalOpen(false)}
                title={editingKycLimit ? 'Edit KYC Limits' : 'Add KYC Limits'}
                footer={
                    <>
                        <button className={adminStyles.btnSecondary} onClick={() => setIsKycLimitsModalOpen(false)}>Cancel</button>
                        <button className={adminStyles.btnPrimary} onClick={handleSaveKycLimit}>Save Limits</button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label className={adminStyles.label}>Country</label>
                            <select
                                className={adminStyles.select}
                                style={{ width: '100%' }}
                                value={kycLimitsForm.country_code}
                                onChange={e => setKycLimitsForm({ ...kycLimitsForm, country_code: e.target.value })}
                                disabled={!!editingKycLimit}
                            >
                                {kycCountryOptions.map(c => (
                                    <option key={c.code} value={c.code}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={adminStyles.label}>Account Type</label>
                            <select
                                className={adminStyles.select}
                                style={{ width: '100%' }}
                                value={kycLimitsForm.account_type}
                                onChange={e => setKycLimitsForm({ ...kycLimitsForm, account_type: e.target.value })}
                                disabled={!!editingKycLimit}
                            >
                                {KYC_ACCOUNT_TYPES.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label className={adminStyles.label}>Tier</label>
                            <select
                                className={adminStyles.select}
                                style={{ width: '100%' }}
                                value={kycLimitsForm.tier_slug}
                                onChange={e => setKycLimitsForm({ ...kycLimitsForm, tier_slug: e.target.value })}
                                disabled={!!editingKycLimit}
                            >
                                {KYC_TIERS.map(t => (
                                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={adminStyles.label}>Currency</label>
                            <input
                                className={adminStyles.input}
                                placeholder="e.g. USD, KES"
                                maxLength={3}
                                value={kycLimitsForm.currency}
                                onChange={e => setKycLimitsForm({ ...kycLimitsForm, currency: e.target.value.toUpperCase() })}
                            />
                        </div>
                    </div>

                    <p style={{ fontSize: '13px', opacity: 0.6, margin: 0 }}>
                        Leave a field blank to inherit the Global default for that value instead of overriding it.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label className={adminStyles.label}>Daily Transfer</label>
                            <input
                                type="number"
                                className={adminStyles.input}
                                placeholder="Inherit global"
                                value={kycLimitsForm.daily_transfer}
                                onChange={e => setKycLimitsForm({ ...kycLimitsForm, daily_transfer: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className={adminStyles.label}>Daily Withdrawal</label>
                            <input
                                type="number"
                                className={adminStyles.input}
                                placeholder="Inherit global"
                                value={kycLimitsForm.daily_withdrawal}
                                onChange={e => setKycLimitsForm({ ...kycLimitsForm, daily_withdrawal: e.target.value })}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label className={adminStyles.label}>Auto-Payout Max</label>
                            <input
                                type="number"
                                className={adminStyles.input}
                                placeholder="Inherit global"
                                value={kycLimitsForm.auto_payout_max}
                                onChange={e => setKycLimitsForm({ ...kycLimitsForm, auto_payout_max: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className={adminStyles.label}>AML Flag Threshold</label>
                            <input
                                type="number"
                                className={adminStyles.input}
                                placeholder="Inherit global"
                                value={kycLimitsForm.aml_flag_threshold}
                                onChange={e => setKycLimitsForm({ ...kycLimitsForm, aml_flag_threshold: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            {/* KYC Requirements Form Modal */}
            <Modal
                isOpen={isKycRequirementsModalOpen}
                onClose={() => setIsKycRequirementsModalOpen(false)}
                title={editingKycRequirement ? 'Edit KYC Requirements' : 'Add KYC Requirements'}
                footer={
                    <>
                        <button className={adminStyles.btnSecondary} onClick={() => setIsKycRequirementsModalOpen(false)}>Cancel</button>
                        <button className={adminStyles.btnPrimary} onClick={handleSaveKycRequirement}>Save Requirements</button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label className={adminStyles.label}>Country</label>
                            <select
                                className={adminStyles.select}
                                style={{ width: '100%' }}
                                value={kycRequirementsForm.country_code}
                                onChange={e => setKycRequirementsForm({ ...kycRequirementsForm, country_code: e.target.value })}
                                disabled={!!editingKycRequirement}
                            >
                                {kycCountryOptions.map(c => (
                                    <option key={c.code} value={c.code}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={adminStyles.label}>Account Type</label>
                            <select
                                className={adminStyles.select}
                                style={{ width: '100%' }}
                                value={kycRequirementsForm.account_type}
                                onChange={e => setKycRequirementsForm({ ...kycRequirementsForm, account_type: e.target.value })}
                                disabled={!!editingKycRequirement}
                            >
                                {KYC_ACCOUNT_TYPES.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={adminStyles.label}>Tier</label>
                        <select
                            className={adminStyles.select}
                            style={{ width: '100%' }}
                            value={kycRequirementsForm.tier_slug}
                            onChange={e => setKycRequirementsForm({ ...kycRequirementsForm, tier_slug: e.target.value })}
                            disabled={!!editingKycRequirement}
                        >
                            {KYC_TIERS.map(t => (
                                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label className={adminStyles.label} style={{ margin: 0 }}>Document Steps</label>
                        <button
                            className={adminStyles.btnSecondary}
                            style={{ padding: '4px 12px', fontSize: '13px' }}
                            onClick={() => setKycRequirementsForm({
                                ...kycRequirementsForm,
                                steps: [...kycRequirementsForm.steps, newStepDraft()],
                            })}
                        >
                            + Add Step
                        </button>
                    </div>

                    {kycRequirementsForm.steps.length === 0 && (
                        <p style={{ fontSize: '13px', opacity: 0.5, margin: 0 }}>No steps defined yet.</p>
                    )}

                    {kycRequirementsForm.steps.map((step, index) => (
                        <div
                            key={step.id}
                            style={{
                                display: 'flex', flexDirection: 'column', gap: '10px',
                                padding: '12px', border: '1px solid var(--color-border, #2a2a2a)', borderRadius: '8px',
                            }}
                        >
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                <div style={{ flex: '0 0 100px' }}>
                                    <label className={adminStyles.label}>Type</label>
                                    <select
                                        className={adminStyles.select}
                                        style={{ width: '100%' }}
                                        value={step.type}
                                        onChange={e => {
                                            const steps = [...kycRequirementsForm.steps];
                                            steps[index] = { ...step, type: e.target.value as 'file' | 'text' };
                                            setKycRequirementsForm({ ...kycRequirementsForm, steps });
                                        }}
                                    >
                                        <option value="file">File</option>
                                        <option value="text">Text</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className={adminStyles.label}>Label</label>
                                    <input
                                        className={adminStyles.input}
                                        placeholder="e.g. National ID"
                                        value={step.label}
                                        onChange={e => {
                                            const steps = [...kycRequirementsForm.steps];
                                            steps[index] = { ...step, label: e.target.value };
                                            setKycRequirementsForm({ ...kycRequirementsForm, steps });
                                        }}
                                    />
                                </div>
                                <button
                                    className={adminStyles.btnSecondary}
                                    style={{ padding: '8px 12px' }}
                                    onClick={() => setKycRequirementsForm({
                                        ...kycRequirementsForm,
                                        steps: kycRequirementsForm.steps.filter((_, i) => i !== index),
                                    })}
                                >
                                    Remove
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label className={adminStyles.label}>Subtype (optional)</label>
                                    <input
                                        className={adminStyles.input}
                                        placeholder="e.g. national_id, passport"
                                        value={step.subtype}
                                        onChange={e => {
                                            const steps = [...kycRequirementsForm.steps];
                                            steps[index] = { ...step, subtype: e.target.value };
                                            setKycRequirementsForm({ ...kycRequirementsForm, steps });
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className={adminStyles.label}>Hint (optional)</label>
                                    <input
                                        className={adminStyles.input}
                                        placeholder="Short one-line tip"
                                        value={step.hint}
                                        onChange={e => {
                                            const steps = [...kycRequirementsForm.steps];
                                            steps[index] = { ...step, hint: e.target.value };
                                            setKycRequirementsForm({ ...kycRequirementsForm, steps });
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="checkbox"
                                    checked={step.mandatory}
                                    onChange={e => {
                                        const steps = [...kycRequirementsForm.steps];
                                        steps[index] = { ...step, mandatory: e.target.checked };
                                        setKycRequirementsForm({ ...kycRequirementsForm, steps });
                                    }}
                                />
                                <span style={{ fontSize: '13px', opacity: 0.8 }}>Mandatory</span>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
}

export default function GlobalCompliancePage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Compliance...</div>}>
            <GlobalComplianceContent />
        </Suspense>
    );
}
