"use client";

/**
 * Global Compliance Administration Page.
 * Governs active tax jurisdictions and supported countries.
 */

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import TaxRateTable from '@/components/admin/finance/TaxRateTable';
import RegionsTab from '@/components/system/settings/RegionsTab';
import TableToolbar from '@/components/shared/TableToolbar';
import Modal from '@/components/shared/Modal';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { TaxRate } from '@/types/admin';
import { useDebounce } from '@/hooks/useDebounce';

function GlobalComplianceContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'tax-rates');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
    const [countries, setCountries] = useState<{ code: string, name: string }[]>([]);
    const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
    const [editingTaxRate, setEditingTaxRate] = useState<TaxRate | null>(null);
    const [taxForm, setTaxForm] = useState({
        display_name: '',
        country_code: 'KE',
        applicable_reason: 'ticket_sale',
        rate_percent: 0,
        is_inclusive: true
    });

    const [taxCurrentPage, setTaxCurrentPage] = useState(1);
    const itemsPerPage = 10;

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
            if (activeTab === 'tax-rates') {
                // Country name is joined client-side: PostgREST can't embed
                // finance.tax_rates -> infra.countries through a plain view.
                const [ratesRes, countriesRes] = await Promise.all([
                    supabase.schema('api').from('v1_tax_rates').select('*').order('display_name'),
                    supabase.schema('api').from('v1_countries').select('code, display_name'),
                ]);
                if (ratesRes.error) throw ratesRes.error;
                if (countriesRes.error) throw countriesRes.error;

                const countryNameByCode = new Map(
                    (countriesRes.data || []).map((c: any) => [c.code, c.display_name])
                );
                setTaxRates((ratesRes.data || []).map((t: any) => ({
                    ...t,
                    country_name: countryNameByCode.get(t.country_code) || t.country_code
                })));
            }
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, supabase, showToast]);

    useEffect(() => {
        fetchData();
    }, [activeTab, debouncedSearch, fetchData]);

    useEffect(() => {
        setTaxCurrentPage(1);
    }, [activeTab, debouncedSearch]);

    useEffect(() => {
        const fetchCountries = async () => {
            const { data } = await supabase.schema('api').from('v1_countries').select('code, display_name').order('display_name');
            if (data) setCountries(data.map((c: any) => ({ code: c.code, name: c.display_name })));
        };
        fetchCountries();
    }, [supabase]);

    const filteredTaxRates = taxRates.filter(t => t.display_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const taxTotalPages = Math.max(1, Math.ceil(filteredTaxRates.length / itemsPerPage));
    const paginatedTaxRates = filteredTaxRates.slice((taxCurrentPage - 1) * itemsPerPage, taxCurrentPage * itemsPerPage);

    const handleSaveTaxRate = async () => {
        try {
            const { error } = await supabase.schema('api').rpc('admin_upsert_tax_rate', {
                p_id: editingTaxRate?.id ?? null,
                p_country_code: taxForm.country_code,
                p_applicable_reason: taxForm.applicable_reason,
                p_display_name: taxForm.display_name,
                p_rate_percent: Number(taxForm.rate_percent),
                p_is_inclusive: taxForm.is_inclusive,
            });
            if (error) throw error;
            showToast(editingTaxRate ? 'Tax rate updated successfully' : 'Tax rate created successfully', 'success');
            setIsTaxModalOpen(false);
            fetchData();
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        }
    };

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Global Compliance & Territories"
                subtitle="Configure regional tax models, control territory parameters and manage global compliance rules."
            />

            <TableToolbar
                searchPlaceholder="Search regions or tax parameters..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            />

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className={adminStyles.tabsHeaderRow} style={{ borderBottom: 'none', marginTop: '16px' }}>
                    <TabsList>
                        <TabsTrigger value="tax-rates">Tax Regions</TabsTrigger>
                        <TabsTrigger value="regions">Supported Countries</TabsTrigger>
                    </TabsList>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activeTab === 'tax-rates' && (
                            <button className={adminStyles.btnPrimary} onClick={() => {
                                setEditingTaxRate(null);
                                setTaxForm({ display_name: '', country_code: 'KE', applicable_reason: 'ticket_sale', rate_percent: 0, is_inclusive: true });
                                setIsTaxModalOpen(true);
                            }}>
                                + Add Tax Rate
                            </button>
                        )}
                    </div>
                </div>

                <TabsContent value="tax-rates">
                    <TaxRateTable
                        data={paginatedTaxRates}
                        isLoading={isLoading}
                        onUpdate={fetchData}
                        currentPage={taxCurrentPage}
                        totalPages={taxTotalPages}
                        onPageChange={setTaxCurrentPage}
                        onEdit={(rate) => {
                            setEditingTaxRate(rate);
                            setTaxForm({
                                display_name: rate.display_name,
                                country_code: rate.country_code,
                                applicable_reason: rate.applicable_reason,
                                rate_percent: rate.rate_percent,
                                is_inclusive: rate.is_inclusive
                            });
                            setIsTaxModalOpen(true);
                        }}
                    />
                </TabsContent>

                <TabsContent value="regions">
                    <RegionsTab searchTerm={searchTerm} />
                </TabsContent>
            </Tabs>

            {/* Global Tax Form Modal */}
            <Modal
                isOpen={isTaxModalOpen}
                onClose={() => setIsTaxModalOpen(false)}
                title={editingTaxRate ? 'Edit Tax Rate' : 'Add New Tax Rate'}
                footer={
                    <>
                        <button className={adminStyles.btnSecondary} onClick={() => setIsTaxModalOpen(false)}>Cancel</button>
                        <button className={adminStyles.btnPrimary} onClick={handleSaveTaxRate}>Save Rate</button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label className={adminStyles.label}>Rate Name</label>
                        <input
                            className={adminStyles.input}
                            placeholder="e.g. VAT, Sales Tax"
                            value={taxForm.display_name}
                            onChange={e => setTaxForm({ ...taxForm, display_name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className={adminStyles.label}>Applicable Reason</label>
                        <select
                            className={adminStyles.select}
                            style={{ width: '100%' }}
                            value={taxForm.applicable_reason}
                            onChange={e => setTaxForm({ ...taxForm, applicable_reason: e.target.value })}
                        >
                            <option value="ticket_sale">Ticket Sale</option>
                            <option value="ad_campaign_payment">Ad Campaign</option>
                            <option value="subscription_payment">Subscription</option>
                            <option value="wallet_top_up">Wallet Top-up</option>
                            <option value="organizer_payout">Organizer Payout</option>
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label className={adminStyles.label}>Country</label>
                            <select
                                className={adminStyles.select}
                                style={{ width: '100%' }}
                                value={taxForm.country_code}
                                onChange={e => setTaxForm({ ...taxForm, country_code: e.target.value })}
                            >
                                {countries.map(c => (
                                    <option key={c.code} value={c.code}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={adminStyles.label}>Rate (%)</label>
                            <input
                                type="number"
                                className={adminStyles.input}
                                value={taxForm.rate_percent}
                                onChange={e => setTaxForm({ ...taxForm, rate_percent: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                        <input
                            type="checkbox"
                            checked={taxForm.is_inclusive}
                            onChange={e => setTaxForm({ ...taxForm, is_inclusive: e.target.checked })}
                        />
                        <span style={{ fontSize: '14px', opacity: 0.8 }}>Inclusive of price</span>
                    </div>
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
