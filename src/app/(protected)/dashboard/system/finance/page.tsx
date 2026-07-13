"use client";

/**
 * Global Finance Administration page.
 * Manages platform-wide wallets, currency markets, payment network configuration,
 * and subscription plan billing constants.
 */

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import FXRateTable from '@/components/system/finance/FXRateTable';
import TaxRateTable from '@/components/admin/finance/TaxRateTable';
import PaymentProvidersTab from '@/components/system/settings/PaymentProvidersTab';
import WalletTable, { AdminWallet } from '@/components/admin/finance/WalletTable';
import TableToolbar from '@/components/shared/TableToolbar';
import Modal from '@/components/shared/Modal';
import FormRow from '@/components/shared/FormRow';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import DataTable from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import FilterChips from '@/components/shared/FilterChips';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { FXRate, TaxRate } from '@/types/admin';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency } from '@/utils/format';

interface SubscriptionPlan {
    id: string;
    display_name: string;
    product_type: string;
    interval: string;
    is_active: boolean;
}

function GlobalFinanceContent() {
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'wallets');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [wallets, setWallets] = useState<AdminWallet[]>([]);
    const [walletStatusFilter, setWalletStatusFilter] = useState('all');
    const [selectedWalletIds, setSelectedWalletIds] = useState<Set<string>>(new Set());
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
    const [fxRates, setFxRates] = useState<FXRate[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [isSyncingFX, setIsSyncingFX] = useState(false);

    const [walletsCurrentPage, setWalletsCurrentPage] = useState(1);
    const [walletsTotalCount, setWalletsTotalCount] = useState(0);
    const [taxCurrentPage, setTaxCurrentPage] = useState(1);
    const [fxCurrentPage, setFxCurrentPage] = useState(1);
    const [plansCurrentPage, setPlansCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const debouncedSearch = useDebounce(searchTerm, 300);

    // Wallet adjust-balance modal state
    const [showAdjustWalletModal, setShowAdjustWalletModal] = useState(false);
    const [adjustWalletKey, setAdjustWalletKey] = useState<string | null>(null);
    const [adjustBalanceType, setAdjustBalanceType] = useState<'cash' | 'credit' | 'escrow'>('cash');
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustReason, setAdjustReason] = useState('');

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', value);
        router.push(`${pathname}?${params.toString()}`);
    };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'wallets') {
                // No p_country_code filter, and account_type='platform' — this
                // is the platform's own per-country fee-collection wallets,
                // distinct from /admin/finance's tenant-only wallets tab.
                const { data, error } = await supabase.schema('api').rpc('get_admin_wallets', {
                    p_search: debouncedSearch,
                    p_status: walletStatusFilter,
                    p_country_code: 'all',
                    p_offset: (walletsCurrentPage - 1) * itemsPerPage,
                    p_limit: itemsPerPage,
                    p_account_type: 'platform'
                });
                if (error) throw error;
                setWallets(data || []);
                setWalletsTotalCount(data?.[0]?.total_count || 0);
            } else if (activeTab === 'tax-rates') {
                // Country name is joined client-side: PostgREST can't embed
                // finance.tax_rates -> infra.countries through a plain view.
                const [ratesRes, countriesRes] = await Promise.all([
                    supabase.schema('api').from('v1_tax_rates').select('*').order('display_name'),
                    supabase.schema('api').from('v1_countries').select('code, display_name'),
                ]);
                if (ratesRes.error) throw ratesRes.error;
                if (countriesRes.error) throw countriesRes.error;

                const countryNameByCode = new Map(
                    (countriesRes.data || []).map((c: { code: string; display_name: string }) => [c.code, c.display_name])
                );
                setTaxRates((ratesRes.data || []).map((t: TaxRate) => ({
                    ...t,
                    country_name: countryNameByCode.get(t.country_code) || t.country_code
                })));
            } else if (activeTab === 'fx-rates') {
                const { data, error } = await supabase.schema('api' as any).from('v1_fx_rates').select('*').order('currency');
                if (error) throw error;
                setFxRates(data || []);
            } else if (activeTab === 'billing-constants') {
                const { data, error } = await supabase
                    .schema('api')
                    .from('v1_subscription_plans')
                    .select('*')
                    .order('display_name');
                if (error) throw error;
                setPlans(data || []);
            }
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, supabase, showToast, debouncedSearch, walletStatusFilter, walletsCurrentPage]);

    useEffect(() => {
        fetchData();
    }, [activeTab, debouncedSearch, fetchData]);

    useEffect(() => {
        const fetchCountries = async () => {
            const { data } = await supabase.schema('api').from('v1_countries').select('code, display_name').order('display_name');
            if (data) setCountries(data.map((c: { code: string; display_name: string }) => ({ code: c.code, name: c.display_name })));
        };
        fetchCountries();
    }, [supabase]);

    useEffect(() => {
        setWalletsCurrentPage(1);
        setTaxCurrentPage(1);
        setFxCurrentPage(1);
        setPlansCurrentPage(1);
    }, [activeTab, debouncedSearch]);

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

    const handleSyncFX = async () => {
        setIsSyncingFX(true);
        showToast('Syncing with global rates...', 'info');
        try {
            const { error } = await supabase.schema('api').rpc('sync_fx_rates');
            if (error) throw error;
            showToast('FX rates synchronized successfully.', 'success');
            fetchData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'FX sync function not available.', 'error');
        } finally {
            setIsSyncingFX(false);
        }
    };

    // ── Wallet Freeze / Unfreeze ────────────────────────────────────────────────
    const handleFreezeWallet = async (accountId: string, currency: string, currentStatus: string) => {
        if (!wallets.find(w => w.account_id === accountId && w.currency === currency)) {
            showToast('Wallet not found (may have been removed).', 'error');
            return;
        }
        const newStatus = currentStatus === 'active' ? 'frozen' : 'active';
        if (!await confirm(`Set wallet ${accountId.slice(0, 8)}…/${currency} to "${newStatus}"?`)) return;

        showToast(`${currentStatus === 'active' ? 'Freezing' : 'Unfreezing'} wallet...`, 'info');
        try {
            // Wallet status changes go through the admin RPC
            // (public.account_wallets is retired).
            const { error } = await supabase.schema('api').rpc('admin_set_wallet_status', {
                p_account_id: accountId,
                p_currency: currency,
                p_status: newStatus
            });
            if (error) throw error;
            showToast(`Wallet ${newStatus}.`, 'success');
            fetchData();
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleAdjustWallet = async () => {
        if (!adjustWalletKey) return;
        const [accountId, currency] = adjustWalletKey.split('|');
        if (!accountId || !currency) { setShowAdjustWalletModal(false); return; }

        const amount = parseFloat(adjustAmount);
        if (isNaN(amount) || amount === 0) { showToast('Enter a non-zero amount.', 'error'); return; }
        const reason = adjustReason.trim() || 'admin_adjustment';

        if (!await confirm(`Apply a ${formatCurrency(amount, currency)} ${adjustBalanceType} adjustment to this wallet? This takes effect immediately.`)) {
            return;
        }

        setShowAdjustWalletModal(false);
        showToast('Adjusting wallet balance…', 'info');
        try {
            const { error } = await supabase.schema('api').rpc('admin_adjust_wallet_balance', {
                p_account_id: accountId,
                p_currency: currency,
                p_amount: amount,
                p_balance_type: adjustBalanceType,
                p_reason: reason,
                p_notes: `system_finance_page`
            });
            if (error) throw error;
            showToast(`Wallet ${adjustBalanceType} adjusted by ${formatCurrency(amount, currency)}.`, 'success');
            fetchData();
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    // Filter plans based on search
    const filteredPlans = plans.filter(p =>
        p.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredTaxRates = taxRates.filter(t => t.display_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const taxTotalPages = Math.max(1, Math.ceil(filteredTaxRates.length / itemsPerPage));
    const paginatedTaxRates = filteredTaxRates.slice((taxCurrentPage - 1) * itemsPerPage, taxCurrentPage * itemsPerPage);

    const filteredRates = fxRates.filter(f => f.currency.toLowerCase().includes(searchTerm.toLowerCase()));
    const fxTotalPages = Math.max(1, Math.ceil(filteredRates.length / itemsPerPage));
    const paginatedRates = filteredRates.slice((fxCurrentPage - 1) * itemsPerPage, fxCurrentPage * itemsPerPage);

    const plansTotalPages = Math.max(1, Math.ceil(filteredPlans.length / itemsPerPage));
    const paginatedPlans = filteredPlans.slice((plansCurrentPage - 1) * itemsPerPage, plansCurrentPage * itemsPerPage);

    const walletsTotalPages = Math.max(1, Math.ceil(walletsTotalCount / itemsPerPage));

    const planColumns = [
        {
            header: 'Plan Name',
            render: (plan: SubscriptionPlan) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{plan.display_name}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{plan.id}</div>
                </div>
            )
        },
        {
            header: 'Product Type',
            render: (plan: SubscriptionPlan) => (
                <Badge variant="subtle" label={plan.product_type} />
            )
        },
        {
            header: 'Billing Interval',
            render: (plan: SubscriptionPlan) => (
                <span style={{ textTransform: 'capitalize' }}>{plan.interval}</span>
            )
        },
        {
            header: 'Status',
            render: (plan: SubscriptionPlan) => (
                <Badge variant={plan.is_active ? 'success' : 'warning'} label={plan.is_active ? 'approved' : 'pending'} />
            )
        }
    ];

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Global Finance"
                subtitle="Oversee platform-wide wallets, tax regions, foreign exchange markets, payment networks and subscription plans."
            />

            <TableToolbar
                searchPlaceholder="Search wallets, tax rates, currency, providers, or plans..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            />

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className={adminStyles.tabsHeaderRow} style={{ borderBottom: 'none', marginTop: '16px' }}>
                    <TabsList>
                        <TabsTrigger value="wallets">Platform Wallets</TabsTrigger>
                        <TabsTrigger value="payment-providers">Payment Networks</TabsTrigger>
                        <TabsTrigger value="billing-constants">Billing Constants</TabsTrigger>
                        <TabsTrigger value="tax-rates">Tax Rates</TabsTrigger>
                        <TabsTrigger value="fx-rates">FX Markets</TabsTrigger>
                    </TabsList>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activeTab === 'wallets' && (
                            <FilterChips
                                options={[
                                    { value: 'all', label: 'All' },
                                    { value: 'active', label: 'Active' },
                                    { value: 'frozen', label: 'Frozen' },
                                    { value: 'restricted', label: 'Restricted' },
                                ]}
                                currentValue={walletStatusFilter}
                                onChange={setWalletStatusFilter}
                            />
                        )}
                        {activeTab === 'tax-rates' && (
                            <button className={adminStyles.btnPrimary} onClick={() => {
                                setEditingTaxRate(null);
                                setTaxForm({ display_name: '', country_code: 'KE', applicable_reason: 'ticket_sale', rate_percent: 0, is_inclusive: true });
                                setIsTaxModalOpen(true);
                            }}>
                                + Add Tax Rate
                            </button>
                        )}
                        {activeTab === 'fx-rates' && (
                            <button
                                className={adminStyles.btnSecondary}
                                onClick={handleSyncFX}
                                disabled={isSyncingFX}
                            >
                                <svg className={isSyncingFX ? adminStyles.spinner : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                                    <path d="M23 4v6h-6M1 20v-6h6"></path>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                                {isSyncingFX ? 'Syncing...' : 'Sync Live Rates'}
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                    <TabsContent value="wallets">
                        <WalletTable
                            data={wallets}
                            isLoading={isLoading}
                            currentPage={walletsCurrentPage}
                            totalPages={walletsTotalPages}
                            onPageChange={setWalletsCurrentPage}
                            selectedIds={selectedWalletIds}
                            onSelect={(id: string) => {
                                const next = new Set(selectedWalletIds);
                                next.has(id) ? next.delete(id) : next.add(id);
                                setSelectedWalletIds(next);
                            }}
                            onSelectAll={() => setSelectedWalletIds(selectedWalletIds.size === wallets.length ? new Set() : new Set(wallets.map(w => `${w.account_id}_${w.currency}`)))}
                            onFreeze={handleFreezeWallet}
                            onAdjustBalance={(accountId, currency) => {
                                setAdjustWalletKey(`${accountId}|${currency}`);
                                setAdjustAmount('');
                                setAdjustReason('');
                                setShowAdjustWalletModal(true);
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="payment-providers">
                        <PaymentProvidersTab searchTerm={searchTerm} />
                    </TabsContent>

                    <TabsContent value="billing-constants">
                        <DataTable
                            data={paginatedPlans}
                            columns={planColumns}
                            isLoading={isLoading}
                            emptyMessage="No subscription plans configured."
                            currentPage={plansCurrentPage}
                            totalPages={plansTotalPages}
                            onPageChange={setPlansCurrentPage}
                        />
                    </TabsContent>

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

                    <TabsContent value="fx-rates">
                        <FXRateTable
                            data={paginatedRates}
                            isLoading={isLoading}
                            onUpdate={fetchData}
                            currentPage={fxCurrentPage}
                            totalPages={fxTotalPages}
                            onPageChange={setFxCurrentPage}
                        />
                    </TabsContent>
                </div>
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
                    <FormRow label="Rate Name">
                        <input
                            className={adminStyles.input}
                            placeholder="e.g. VAT, Sales Tax"
                            value={taxForm.display_name}
                            onChange={e => setTaxForm({ ...taxForm, display_name: e.target.value })}
                        />
                    </FormRow>
                    <FormRow label="Applicable Reason">
                        <select
                            className={adminStyles.select}
                            value={taxForm.applicable_reason}
                            onChange={e => setTaxForm({ ...taxForm, applicable_reason: e.target.value })}
                        >
                            <option value="ticket_sale">Ticket Sale</option>
                            <option value="ad_campaign_payment">Ad Campaign</option>
                            <option value="subscription_payment">Subscription</option>
                            <option value="wallet_top_up">Wallet Top-up</option>
                            <option value="organizer_payout">Organizer Payout</option>
                        </select>
                    </FormRow>
                    <div className={adminStyles.formGrid}>
                        <FormRow label="Country">
                            <select
                                className={adminStyles.select}
                                value={taxForm.country_code}
                                onChange={e => setTaxForm({ ...taxForm, country_code: e.target.value })}
                            >
                                {countries.map(c => (
                                    <option key={c.code} value={c.code}>{c.name}</option>
                                ))}
                            </select>
                        </FormRow>
                        <FormRow label="Rate (%)">
                            <input
                                type="number"
                                className={adminStyles.input}
                                value={taxForm.rate_percent}
                                onChange={e => setTaxForm({ ...taxForm, rate_percent: Number(e.target.value) })}
                            />
                        </FormRow>
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

            {/* Wallet Adjust Balance Modal */}
            {adjustWalletKey && (
                <Modal
                    isOpen={showAdjustWalletModal}
                    onClose={() => setShowAdjustWalletModal(false)}
                    title="Adjust Wallet Balance"
                    footer={
                        <>
                            <button className={adminStyles.btnSecondary} onClick={() => setShowAdjustWalletModal(false)}>Cancel</button>
                            <button className={adminStyles.btnPrimary} onClick={handleAdjustWallet} disabled={!adjustAmount || parseFloat(adjustAmount) === 0}>Apply Adjustment</button>
                        </>
                    }
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
                            <p><strong>Wallet:</strong> {adjustWalletKey}</p>
                        </div>
                        <div className={adminStyles.formGrid}>
                            <FormRow label="Balance Type">
                                <select
                                    className={adminStyles.select}
                                    value={adjustBalanceType}
                                    onChange={e => setAdjustBalanceType(e.target.value as any)}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="credit">Credit</option>
                                    <option value="escrow">Escrow</option>
                                </select>
                            </FormRow>
                            <FormRow label={`Amount (${adjustBalanceType === 'cash' ? '±' : 'signed value'})`}>
                                <input
                                    type="number"
                                    step="0.01"
                                    className={adminStyles.input}
                                    placeholder="e.g. 500.00 or -250.00"
                                    value={adjustAmount}
                                    onChange={e => setAdjustAmount(e.target.value)}
                                />
                            </FormRow>
                        </div>
                        <FormRow label="Reason">
                            <input
                                type="text"
                                className={adminStyles.input}
                                placeholder="e.g. Ticket refund, goodwill, manual correction"
                                value={adjustReason}
                                onChange={e => setAdjustReason(e.target.value)}
                            />
                        </FormRow>
                    </div>
                </Modal>
            )}

            {ConfirmDialog}
        </div>
    );
}

export default function GlobalFinancePage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Finance...</div>}>
            <GlobalFinanceContent />
        </Suspense>
    );
}
