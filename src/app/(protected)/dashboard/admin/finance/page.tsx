"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useAction } from '@/hooks/useAction';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';
import adminStyles from '../page.module.css';
import { useOrganization } from '@/context/OrganizationContext';
import FinanceTable from '@/components/features/finance/FinanceTable';
import PromoCodeTable from '@/components/admin/finance/PromoCodeTable';
import TaxRateTable from '@/components/admin/finance/TaxRateTable';
import WalletTable, { AdminWallet } from '@/components/admin/finance/WalletTable';
import SubscriptionTable, { Subscription } from '@/components/admin/finance/SubscriptionTable';
import TableToolbar from '@/components/shared/TableToolbar';
import FilterChips from '@/components/shared/FilterChips';
import DateRangeRow from '@/components/shared/DateRangeRow';
import AmountRangeRow from '@/components/shared/AmountRangeRow';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import Modal from '@/components/shared/Modal';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { FinanceTransaction } from '@/types/organize';
import type { PromoCode, TaxRate } from '@/types/admin';
import { exportToCSV } from '@/utils/export';
import { formatDate, formatCurrency } from '@/utils/format';
import RejectionModal from '@/components/shared/RejectionModal';

import { useDebounce } from '@/hooks/useDebounce';

function FinanceContent() {
    const { showToast } = useToast();
    const { run: runAction } = useAction();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const { activeAccount } = useOrganization();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const resolvedCountryFilter = useMemo(() => {
        if (typeof window !== 'undefined' && activeAccount?.type === 'platform') {
            const proxyCode = localStorage.getItem('lynks_proxy_country_code');
            if (proxyCode) return proxyCode;
        }
        if (activeAccount?.country_code) {
            return activeAccount.country_code;
        }
        return 'all';
    }, [activeAccount]);

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'wallets');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isStatsLoading, setIsStatsLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const debouncedSearch = useDebounce(searchTerm, 500);
    const itemsPerPage = 20;

    // Date range state
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Amount range state (wallets tab)
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');

    // State for different datasets
    const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [wallets, setWallets] = useState<AdminWallet[]>([]);

    const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
    const [selectedWalletIds, setSelectedWalletIds] = useState<Set<string>>(new Set());

    // Subscription Action State
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
    const [newPlanId, setNewPlanId] = useState('');

    // Selection state for Promo Codes
    const [selectedPromoIds, setSelectedPromoIds] = useState<Set<string>>(new Set());

    // Selection state for Subscriptions
    const [selectedSubIds, setSelectedSubIds] = useState<Set<string>>(new Set());

    // Subscription plan options pre-loaded for the plan-migration select
    const [subscriptionPlans, setSubscriptionPlans] = useState<Array<{ id: string; display_name: string }>>([]);

    // Global Stats state
    interface GlobalFinanceStats {
        platformRevenue: number | null;
        pendingPayouts: number | null;
        ticketCommission: number | null;
        adRevenue: number | null;
        payoutRequestCount: number | null;
        escrowTotal: number | null;
        failureRate: number | null;
        failedVolume: number | null;
        mrr: number | null;
    }

    const [globalStats, setGlobalStats] = useState<GlobalFinanceStats>({
        platformRevenue: null,
        pendingPayouts: null,
        ticketCommission: null,
        adRevenue: null,
        payoutRequestCount: null,
        escrowTotal: null,
        failureRate: null,
        failedVolume: null,
        mrr: null
    });

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) {
            setActiveTab(tab as typeof activeTab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab);
        setCategoryFilter('all');
        setStartDate('');
        setEndDate('');
        setSearchTerm('');
        setMinAmount('');
        setMaxAmount('');
        if (newTab === 'subscriptions') {
            fetchSubscriptionPlans();
        }
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    // Wallet Actions — state keyed by (account_id, currency) — a unique compound key
    // in the finance.account_wallets table is (account_id, currency).
    const [adjustWalletKey, setAdjustWalletKey] = useState<string | null>(null);
    const [showAdjustWalletModal, setShowAdjustWalletModal] = useState(false);
    const [adjustBalanceType, setAdjustBalanceType] = useState<'cash' | 'credit' | 'escrow'>('cash');
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustReason, setAdjustReason] = useState('');

    const fetchSubscriptionPlans = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .schema('api')
                .from('v1_subscription_plans')
                .select('id, display_name, product_type')
                .order('display_name');
            if (error) throw error;
            setSubscriptionPlans((data || []) as any);
        } catch (err) {
            console.error('Failed to fetch subscription plans:', err);
        }
    }, [supabase]);

    const fetchGlobalStats = useCallback(async () => {
        setIsStatsLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('admin_stat_summary');
            if (error) throw error;
    
            setGlobalStats({
                platformRevenue: data.finance.commission,
                pendingPayouts: data.finance.pending_payouts,
                ticketCommission: data.finance.commission, // Using commission as proxy for now
                payoutRequestCount: data.finance.payout_count,
                adRevenue: data.advertising.spend_30d,
                failureRate: data.finance.failure_rate,
                failedVolume: data.finance.failed_volume,
                escrowTotal: data.finance.escrow_total,
                mrr: data.finance.mrr
            });
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to load financial aggregates.', 'error');
        } finally {
            setIsStatsLoading(false);
        }
    }, [supabase, showToast]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            
            // Merged transaction tabs: transactions, revenue, refunds, escrow
            if (activeTab === 'transactions') {
                let p_category = categoryFilter;

                const { data, error } = await supabase.schema('api').rpc('get_admin_transactions', {
                    p_search: debouncedSearch,
                    p_category: p_category,
                    p_start_date: startDate ? new Date(startDate).toISOString() : null,
                    p_end_date: endDate ? new Date(endDate).toISOString() : null,
                    p_country_code: resolvedCountryFilter,
                    p_offset: (currentPage - 1) * itemsPerPage,
                    p_limit: itemsPerPage
                });

                if (error) throw error;
                const total = data?.[0]?.total_count || 0;
                setTotalCount(total);

                interface TransactionRow {
                    id: string;
                    reason: string;
                    event_title: string | null;
                    amount: number;
                    created_at: string;
                    status: string;
                    category: string;
                    reference: string;
                    sender_name: string | null;
                    recipient_name: string | null;
                }

                setTransactions((data || []).map((tx: TransactionRow) => ({
                    id: tx.id,
                    description: `${tx.reason.replace(/_/g, ' ')} for ${tx.event_title || 'System'}`,
                    amount: tx.amount,
                    date: tx.created_at,
                    status: tx.status,
                    type: tx.reason as any,
                    category: tx.category,
                    reference: tx.reference,
                    event: tx.event_title,
                    sender: tx.sender_name,
                    recipient: tx.recipient_name,
                    createdAt: tx.created_at
                })));
            } else if (activeTab === 'subscriptions') {
                const { data, error } = await supabase.schema('api').rpc('get_admin_subscriptions', {
                    p_search: debouncedSearch,
                    p_status: categoryFilter, // Reuse categoryFilter for status
                    p_country_code: resolvedCountryFilter,
                    p_start_date: startDate ? new Date(startDate).toISOString() : null,
                    p_end_date: endDate ? new Date(endDate).toISOString() : null,
                    p_offset: (currentPage - 1) * itemsPerPage,
                    p_limit: itemsPerPage
                });

                if (error) throw error;
                setSubscriptions((data || []).map((s: any) => ({
                    ...s,
                    // Ensure reporting fields are included in the state
                    reporting_amount: s.reporting_amount,
                    reporting_currency: s.reporting_currency
                })));
                setTotalCount(data?.[0]?.total_count || 0);
            } else if (activeTab === 'wallets') {
                const { data, error } = await supabase.schema('api').rpc('get_admin_wallets', {
                    p_search: debouncedSearch,
                    p_status: categoryFilter,
                    p_country_code: resolvedCountryFilter,
                    p_min_amount: minAmount ? parseFloat(minAmount) : null,
                    p_max_amount: maxAmount ? parseFloat(maxAmount) : null,
                    p_offset: (currentPage - 1) * itemsPerPage,
                    p_limit: itemsPerPage,
                    // Exclude the country's own platform fee-collection wallet —
                    // that's a system wallet, not a tenant's, and belongs on
                    // /dashboard/system/finance's dedicated Platform Wallets tab.
                    p_account_type: 'tenant'
                });

                if (error) throw error;
                setWallets(data || []);
                setTotalCount(data?.[0]?.total_count || 0);

            } else if (activeTab === 'promo-codes') {
                const { data, error } = await supabase
                    .schema('api')
                    .from('v1_admin_promo_codes')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                interface PromoRow {
                    id: string;
                    code: string;
                    type: string;
                    value: number;
                    uses_count: number;
                    max_uses: number;
                    is_active: boolean;
                    created_at: string;
                    event_title: string | null;
                }

                // v1_admin_promo_codes denormalizes the single linked event's
                // title (promo codes link to at most one event, per the form).
                setPromoCodes((data || []).map((p: PromoRow) => ({
                    id: p.id,
                    code: p.code,
                    type: p.type as any,
                    value: p.value,
                    uses_count: p.uses_count,
                    max_uses: p.max_uses,
                    is_active: p.is_active,
                    event_title: p.event_title || 'Global',
                    created_at: p.created_at
                })));
            } else if (activeTab === 'tax-rates') {
                const { data, error } = await supabase
                    .schema('api')
                    .from('v1_tax_rates')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setTaxRates(data || []);
            }
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, supabase, showToast, startDate, endDate, minAmount, maxAmount, currentPage, debouncedSearch, categoryFilter, resolvedCountryFilter, activeAccount?.country_code]);

    // ── Realtime Listener for Financial Updates ──────────────────────────────
    // Use refs so the channel is only created once; callbacks always see latest state
    const fetchDataRef = useRef(fetchData);
    const fetchGlobalStatsRef = useRef(fetchGlobalStats);
    const activeTabRef = useRef(activeTab);
    useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);
    useEffect(() => { fetchGlobalStatsRef.current = fetchGlobalStats; }, [fetchGlobalStats]);
    useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

    useEffect(() => {
        const channel = supabase
            .channel('admin_finance_updates')
            .on(
                'postgres_changes',
                // 'finance' is the owning schema — 'transactions' was a
                // nonexistent schema name, so this listener never fired.
                { event: '*', schema: 'finance', table: 'transactions' },
                () => {
                    fetchGlobalStatsRef.current();
                    if (activeTabRef.current === 'transactions') {
                        fetchDataRef.current();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    useEffect(() => {
        fetchGlobalStats();
    }, [fetchGlobalStats]);

    // Pagination    // Reset pagination and refresh when tab or filter changes
    useEffect(() => {
        setCurrentPage(1);
        fetchData();
    }, [activeTab, debouncedSearch, startDate, endDate, categoryFilter, minAmount, maxAmount]);

    useEffect(() => {
        fetchData();
        setSelectedTxIds(new Set());
    }, [fetchData]);

    /**
     * Exports current dataset to CSV
     */
    const handleBulkExport = () => {
        if (transactions.length === 0) {
            showToast('No transactions to export.', 'warning');
            return;
        }
        showToast('Preparing CSV export...', 'info');
        const rows = transactions.map(tx => ({
            id: tx.id,
            reference: tx.reference || '',
            date: formatDate(tx.date),
            description: tx.description,
            type: tx.type,
            category: tx.category || '',
            amount: tx.amount,
            status: tx.status,
            event: tx.event || '',
        }));
        exportToCSV(rows, `transactions_export_${new Date().toISOString().slice(0, 10)}`);
        showToast('Export complete.', 'success');
    };



    // ── Subscription Management Handlers ─────────────────────────────────────
    const handleCancelSubscription = async (id: string) => {
        if (!await confirm('Are you sure you want to cancel this subscription? Immediate cancellation will terminate access.')) return;

        await runAction(
            () => supabase.schema('api').rpc('admin_cancel_subscription', { p_subscription_id: id, p_immediate: true }),
            { loadingMessage: 'Cancelling subscription...', successMessage: 'Subscription cancelled.', onSuccess: fetchData }
        );
    };

    const handleReactivateSubscription = async (id: string) => {
        if (!await confirm('Reactivate this subscription?')) return;

        await runAction(
            () => supabase.schema('api').rpc('admin_reactivate_subscription', { p_subscription_id: id }),
            { loadingMessage: 'Reactivating subscription...', successMessage: 'Subscription reactivated.', onSuccess: fetchData }
        );
    };

    const handleOpenPlanModal = (sub: Subscription) => {
        setSelectedSub(sub);
        setNewPlanId(sub.plan_id);
        setIsPlanModalOpen(true);
    };

    const handleUpdatePlan = async () => {
        if (!selectedSub || !newPlanId) return;
        if (newPlanId === selectedSub.plan_id) {
            setIsPlanModalOpen(false);
            return;
        }

        await runAction(
            () => supabase.schema('api').rpc('admin_change_subscription_plan', {
                p_subscription_id: selectedSub.id,
                p_new_plan_id: newPlanId
            }),
            {
                loadingMessage: `Migrating subscription to ${newPlanId}...`,
                successMessage: 'Plan migrated successfully.',
                onSuccess: () => { setIsPlanModalOpen(false); fetchData(); }
            }
        );
    };

    // ── Wallet Freeze / Unfreeze ────────────────────────────────────────────────
    const handleFreezeWallet = async (accountId: string, currency: string, currentStatus: string) => {
        if (!wallets.find(w => w.account_id === accountId && w.currency === currency)) {
            showToast('Wallet not found (may have been removed).', 'error');
            return;
        }
        const newStatus = currentStatus === 'active' ? 'frozen' : 'active';
        if (!await confirm(`Set wallet ${accountId.slice(0, 8)}…/${currency} to "${newStatus}"?`)) return;

        await runAction(
            () => supabase.schema('api').rpc('admin_set_wallet_status', {
                p_account_id: accountId,
                p_currency: currency,
                p_status: newStatus
            }),
            {
                loadingMessage: `${currentStatus === 'active' ? 'Freezing' : 'Unfreezing'} wallet...`,
                successMessage: `Wallet ${newStatus}.`,
                onSuccess: fetchData
            }
        );
    };

    const handleAdjustWallet = async () => {
        if (!adjustWalletKey) return;
        const [accountId, currency] = adjustWalletKey.split('|');
        if (!accountId || !currency) { setShowAdjustWalletModal(false); return; }

        const amount = parseFloat(adjustAmount);
        if (isNaN(amount) || amount === 0) { showToast('Enter a non-zero amount.', 'error'); return; }
        const reason = adjustReason.trim() || 'admin_adjustment';

        setShowAdjustWalletModal(false);
        await runAction(
            () => supabase.schema('api').rpc('admin_adjust_wallet_balance', {
                p_account_id: accountId,
                p_currency: currency,
                p_amount: amount,
                p_balance_type: adjustBalanceType,
                p_reason: reason,
                p_notes: `admin_finance_page`
            }),
            {
                loadingMessage: 'Adjusting wallet balance…',
                successMessage: `Wallet ${adjustBalanceType} adjusted by ${formatCurrency(amount, currency)}.`,
                onSuccess: fetchData
            }
        );
    };

    const getBulkActions = (): BulkAction[] => {
        if (activeTab === 'promo-codes' && selectedPromoIds.size > 0) {
            return [
                {
                    label: 'Batch Deactivate',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>,
                    onClick: () => runAction(
                        () => supabase.schema('api').rpc('admin_set_promo_code_status', {
                            p_ids: Array.from(selectedPromoIds),
                            p_is_active: false,
                        }),
                        {
                            loadingMessage: `Deactivating ${selectedPromoIds.size} codes...`,
                            successMessage: `Successfully deactivated ${selectedPromoIds.size} codes.`,
                            onSuccess: () => { setSelectedPromoIds(new Set()); fetchData(); }
                        }
                    ),
                    variant: 'danger'
                },
                {
                    label: 'Batch Activate',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
                    onClick: () => runAction(
                        () => supabase.schema('api').rpc('admin_set_promo_code_status', {
                            p_ids: Array.from(selectedPromoIds),
                            p_is_active: true,
                        }),
                        {
                            loadingMessage: `Activating ${selectedPromoIds.size} codes...`,
                            successMessage: `Successfully activated ${selectedPromoIds.size} codes.`,
                            onSuccess: () => { setSelectedPromoIds(new Set()); fetchData(); }
                        }
                    ),
                    variant: 'success'
                }
            ];
        }

        if (activeTab === 'wallets' && selectedWalletIds.size > 0) {
            const allFrozen = selectedWalletIds.size === wallets.filter(
                (w: any) => selectedWalletIds.has(`${w.account_id}_${w.currency}`) && w.status === 'frozen'
            ).length;
            const actionLabel = allFrozen ? 'Unfreeze Selected' : 'Freeze Selected';
            const newStatus = allFrozen ? 'active' : 'frozen';

            return [{
                label: actionLabel,
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
                    onClick: async () => {
                        if (!await confirm(`${actionLabel} ${selectedWalletIds.size} wallets?`)) return;
                        showToast(`${actionLabel}…`, 'info');
                        // Wallet status changes go through the admin RPC
                        // (public.account_wallets is retired); selection keys
                        // are account_id|currency composites already.
                        const targets = Array.from(selectedWalletIds)
                            .map((key: string) => (wallets as any[]).find(w => `${w.account_id}_${w.currency}` === key))
                            .filter(Boolean) as { account_id: string; currency: string }[];
                        if (targets.length === 0) { showToast('No matching wallets found.', 'error'); return; }
                        const results = await Promise.all(targets.map(w =>
                            supabase.schema('api').rpc('admin_set_wallet_status', {
                                p_account_id: w.account_id,
                                p_currency: w.currency,
                                p_status: newStatus
                            })
                        ));
                        const failed = results.filter(r => r.error);
                        if (failed.length > 0) { showToast(getErrorMessage(failed[0].error), 'error'); return; }
                        showToast(`${targets.length} wallet(s) ${newStatus}.`, 'success');
                        setSelectedWalletIds(new Set());
                        fetchData();
                    },
                variant: allFrozen ? 'success' : 'danger'
            }];
        }

        if (activeTab === 'subscriptions' && selectedSubIds.size > 0) {
            return [{
                label: 'Cancel Selected Subscriptions',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>,
                onClick: async () => {
                    if (!await confirm(`Cancel ${selectedSubIds.size} subscriptions?`)) return;
                    showToast(`Cancelling ${selectedSubIds.size} subscriptions…`, 'info');
                    const ids = Array.from(selectedSubIds);
                    const results = await Promise.all(
                        ids.map((id: string) =>
                            supabase.schema('api').rpc('admin_cancel_subscription', { p_subscription_id: id, p_immediate: true })
                        )
                    );
                    const failures = results.filter(r => r.error);
                    if (failures.length) {
                        showToast(getErrorMessage(failures[0].error), 'error');
                    } else {
                        showToast(`${selectedSubIds.size} subscription(s) cancelled.`, 'success');
                    }
                    setSelectedSubIds(new Set());
                    fetchData();
                },
                variant: 'danger'
            }];
        }
        return [];
    };
    
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Finance"
                subtitle="Monitor platform revenue, manage payouts and configure financial settings."
                actionLabel="Export Transactions"
                onActionClick={handleBulkExport}
                actionIcon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                }
            />

            <div className={sharedStyles.statsGrid}>
                <StatCard 
                    label="Platform MRR" 
                    value={globalStats.mrr !== null ? formatCurrency(globalStats.mrr) : null} 
                    change="Monthly Recurring Revenue"
                    trend="positive"
                    isLoading={isStatsLoading} 
                />
                <StatCard 
                    label="Platform Revenue" 
                    value={globalStats.platformRevenue !== null ? formatCurrency(globalStats.platformRevenue) : null} 
                    change="Net commission & fees"
                    trend="positive"
                    isLoading={isStatsLoading} 
                />
                <StatCard 
                    label="Pending Payouts" 
                    value={globalStats.pendingPayouts !== null ? formatCurrency(globalStats.pendingPayouts) : null} 
                    change={globalStats.payoutRequestCount !== null ? `${globalStats.payoutRequestCount} active requests` : '...'}
                    trend="neutral"
                    isLoading={isStatsLoading} 
                />
                <StatCard 
                    label="Escrow Total" 
                    value={globalStats.escrowTotal !== null ? formatCurrency(globalStats.escrowTotal) : null} 
                    change="Funds in transit"
                    trend="neutral"
                    isLoading={isStatsLoading} 
                />
            </div>



            <TableToolbar
                searchPlaceholder="Search..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                {activeTab === 'wallets' && (
                    <AmountRangeRow 
                        minAmount={minAmount}
                        maxAmount={maxAmount}
                        onMinAmountChange={setMinAmount}
                        onMaxAmountChange={setMaxAmount}
                        onClear={() => {
                            setMinAmount('');
                            setMaxAmount('');
                        }}
                    />
                )}
                {activeTab === 'transactions' && (
                    <DateRangeRow 
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                        onClear={() => {
                            setStartDate('');
                            setEndDate('');
                        }}
                    />
                )}
                {activeTab === 'subscriptions' && (
                    <DateRangeRow 
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                        onClear={() => {
                            setStartDate('');
                            setEndDate('');
                        }}
                    />
                )}
            </TableToolbar>

            <Tabs value={activeTab} onValueChange={handleTabChange} className={styles.tabsReset}>
                <div className={adminStyles.tabsHeaderRow}>
                    <TabsList>
                        <TabsTrigger value="wallets">Wallets</TabsTrigger>
                        <TabsTrigger value="subscriptions">Subscription</TabsTrigger>
                        <TabsTrigger value="transactions">Transactions</TabsTrigger>
                        <TabsTrigger value="tax-rates">Tax Rates</TabsTrigger>
                    </TabsList>

                    <div className={adminStyles.chipsWrapper}>
                        {activeTab === 'transactions' && (
                            <FilterChips
                                options={[
                                    { value: 'all', label: 'All Transactions' },
                                    { value: 'incoming', label: 'Revenue (Incoming)' },
                                    { value: 'outgoing', label: 'Refunds (Outgoing)' },
                                    { value: 'hold', label: 'Escrow (Hold)' },
                                    { value: 'internal', label: 'Internal Transfers' },
                                ]}
                                currentValue={categoryFilter}
                                onChange={setCategoryFilter}
                            />
                        )}

                        {activeTab === 'subscriptions' && (
                            <FilterChips
                                options={[
                                    { value: 'all', label: 'All Statuses' },
                                    { value: 'active', label: 'Active' },
                                    { value: 'trialing', label: 'Trialing' },
                                    { value: 'past_due', label: 'Past Due' },
                                    { value: 'canceled', label: 'Canceled' },
                                ]}
                                currentValue={categoryFilter}
                                onChange={setCategoryFilter}
                            />
                        )}
                        {activeTab === 'wallets' && (
                            <FilterChips
                                options={[
                                    { value: 'all', label: 'All Statuses' },
                                    { value: 'active', label: 'Active' },
                                    { value: 'frozen', label: 'Frozen' },
                                    { value: 'restricted', label: 'Restricted' },
                                ]}
                                currentValue={categoryFilter}
                                onChange={setCategoryFilter}
                            />
                        )}
                    </div>
                </div>

                <TabsContent value="wallets">
                    <WalletTable
                        data={wallets}
                        isLoading={isLoading}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
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
                            setShowAdjustWalletModal(true);
                        }}
                    />
                </TabsContent>

                <TabsContent value="subscriptions">
                    <SubscriptionTable
                        data={subscriptions}
                        isLoading={isLoading}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        onCancel={handleCancelSubscription}
                        onReactivate={handleReactivateSubscription}
                        onChangePlan={(id) => {
                            const sub = subscriptions.find(s => s.id === id);
                            if (sub) handleOpenPlanModal(sub);
                        }}
                        selectedIds={selectedSubIds}
                        onSelect={(id: string) => {
                            const next = new Set(selectedSubIds);
                            next.has(id) ? next.delete(id) : next.add(id);
                            setSelectedSubIds(next);
                        }}
                        onSelectAll={() => setSelectedSubIds(selectedSubIds.size === subscriptions.length ? new Set() : new Set(subscriptions.map(s => s.id)))}
                    />
                </TabsContent>

                <TabsContent value="transactions">
                    <FinanceTable
                        transactions={transactions.filter(tx => tx.description.toLowerCase().includes(searchTerm.toLowerCase()))}
                        selectedIds={selectedTxIds}
                        onSelect={(id) => {
                            const next = new Set(selectedTxIds);
                            next.has(id) ? next.delete(id) : next.add(id);
                            setSelectedTxIds(next);
                        }}
                        onSelectAll={() => setSelectedTxIds(selectedTxIds.size === transactions.length ? new Set() : new Set(transactions.map(t => t.id)))}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </TabsContent>

                <TabsContent value="tax-rates">
                    <TaxRateTable 
                        data={taxRates.filter(p => p.display_name.toLowerCase().includes(searchTerm.toLowerCase()))} 
                        isLoading={isLoading} 
                        onUpdate={fetchData}
                    />
                </TabsContent>
            </Tabs>

            <BulkActionsBar
                actions={getBulkActions()}
                selectedCount={
                    activeTab === 'promo-codes' ? selectedPromoIds.size :
                    activeTab === 'wallets' ? selectedWalletIds.size :
                    activeTab === 'subscriptions' ? selectedSubIds.size :
                    0
                }
                onCancel={() => {
                    setSelectedPromoIds(new Set());
                    setSelectedWalletIds(new Set());
                    setSelectedSubIds(new Set());
                }}
            />

            {/* Plan Migration Modal */}
            <Modal
                isOpen={isPlanModalOpen}
                onClose={() => setIsPlanModalOpen(false)}
                title="Change Subscription Plan"
                footer={
                    <>
                        <button className={adminStyles.btnSecondary} onClick={() => setIsPlanModalOpen(false)}>Cancel</button>
                        <button className={adminStyles.btnPrimary} onClick={handleUpdatePlan}>Migrate Plan</button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
                        <p><strong>Account:</strong> {selectedSub?.account_name}</p>
                        <p><strong>Current Plan:</strong> {selectedSub?.plan_name}</p>
                    </div>
                    <div>
                        <label className={adminStyles.label}>Target Plan Tier</label>
                        <select
                            className={adminStyles.select}
                            style={{ width: '100%' }}
                            value={newPlanId}
                            onChange={e => setNewPlanId(e.target.value)}
                        >
                            <option value="" disabled>Select a plan…</option>
                            {subscriptionPlans.map(plan => (
                                <option key={plan.id} value={plan.id}>{plan.display_name}</option>
                            ))}
                        </select>
                        <p style={{ fontSize: '11px', marginTop: '8px', opacity: 0.6 }}>
                            Note: Changing the plan will update the enrollment immediately. Prorating must be handled manually in the gateway if required.
                        </p>
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label className={adminStyles.label}>Balance Type</label>
                                <select
                                    className={adminStyles.select}
                                    style={{ width: '100%' }}
                                    value={adjustBalanceType}
                                    onChange={e => setAdjustBalanceType(e.target.value as any)}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="credit">Credit</option>
                                    <option value="escrow">Escrow</option>
                                </select>
                            </div>
                            <div>
                                <label className={adminStyles.label}>Amount ({adjustBalanceType === 'cash' ? '±' : 'signed value'})</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className={adminStyles.input}
                                    placeholder="e.g. 500.00 or -250.00"
                                    value={adjustAmount}
                                    onChange={e => setAdjustAmount(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={adminStyles.label}>Reason</label>
                            <input
                                type="text"
                                className={adminStyles.input}
                                placeholder="e.g. Ticket refund, goodwill, manual correction"
                                value={adjustReason}
                                onChange={e => setAdjustReason(e.target.value)}
                            />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default function AdminFinancePage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Finance...</div>}>
            <FinanceContent />
        </Suspense>
    );
}
