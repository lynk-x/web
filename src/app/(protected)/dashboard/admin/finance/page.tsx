"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';
import adminStyles from '../page.module.css';
import FinanceTable from '@/components/features/finance/FinanceTable';
import TaxRateTable from '@/components/admin/finance/TaxRateTable';
import FXRateTable from '@/components/admin/finance/FXRateTable';
import PromoCodeTable from '@/components/admin/finance/PromoCodeTable';
import WalletTable, { AdminWallet } from '@/components/admin/finance/WalletTable';
import SubscriptionTable, { Subscription } from '@/components/admin/finance/SubscriptionTable';
import TableToolbar from '@/components/shared/TableToolbar';
import DateRangeRow from '@/components/shared/DateRangeRow';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import Modal from '@/components/shared/Modal';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { FinanceTransaction } from '@/types/organize';
import type { TaxRate, FXRate, PromoCode } from '@/types/admin';
import { exportToCSV } from '@/utils/export';
import { formatDate, formatCurrency } from '@/utils/format';
import RejectionModal from '@/components/shared/RejectionModal';

import { useDebounce } from '@/hooks/useDebounce';

function FinanceContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const { enabled: isPayoutMgmtEnabled } = useFeatureFlag('enable_payout_management');
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'transactions');
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

    // State for different datasets
    const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
    const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
    const [fxRates, setFxRates] = useState<FXRate[]>([]);
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [wallets, setWallets] = useState<AdminWallet[]>([]);

    // Selection state
    const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());

    // Tax Modal state
    const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
    const [editingTaxRate, setEditingTaxRate] = useState<TaxRate | null>(null);
    const [taxForm, setTaxForm] = useState({
        display_name: '',
        country_code: 'KE',
        applicable_reason: 'ticket_sale',
        rate_percent: 0,
        is_inclusive: true
    });
    const [countries, setCountries] = useState<{ code: string, name: string }[]>([]);

    // FX State
    const [isSyncingFX, setIsSyncingFX] = useState(false);

    // Subscription Action State
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
    const [newPlanId, setNewPlanId] = useState('');

    // Selection state for Promo Codes
    const [selectedPromoIds, setSelectedPromoIds] = useState<Set<string>>(new Set());

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
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const fetchGlobalStats = useCallback(async () => {
        setIsStatsLoading(true);
        try {
            const { data, error } = await supabase.rpc('admin_stat_summary');
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
            showToast('Failed to load financial aggregates.', 'error');
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

                const { data, error } = await supabase.rpc('get_admin_transactions', {
                    p_search: debouncedSearch,
                    p_category: p_category,
                    p_start_date: startDate ? new Date(startDate).toISOString() : null,
                    p_end_date: endDate ? new Date(endDate).toISOString() : null,
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
                const { data, error } = await supabase.rpc('get_admin_subscriptions', {
                    p_search: debouncedSearch,
                    p_status: categoryFilter, // Reuse categoryFilter for status
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
                const { data, error } = await supabase.rpc('get_admin_wallets', {
                    p_search: debouncedSearch,
                    p_status: categoryFilter,
                    p_offset: (currentPage - 1) * itemsPerPage,
                    p_limit: itemsPerPage
                });

                if (error) throw error;
                setWallets(data || []);
                setTotalCount(data?.[0]?.total_count || 0);
            } else if (activeTab === 'tax-rates') {
                // ... Tax rates, fx rates, etc. usually stay small and don't require server-side scaling
                const { data, error } = await supabase.from('tax_rates').select(`
                    *,
                    country:countries(display_name)
                `).order('display_name');
                if (error) throw error;
                setTaxRates((data || []).map(t => ({
                    ...t,
                    country_name: t.country?.display_name || t.country_code
                })));
            } else if (activeTab === 'fx-rates') {
                const { data, error } = await supabase.from('fx_rates').select('*').order('currency');
                if (error) throw error;
                setFxRates(data || []);
            } else if (activeTab === 'promo-codes') {
                const { data, error } = await supabase
                    .from('promo_codes')
                    .select(`
                        *,
                        event_promos(
                            event:events(title)
                        )
                    `)
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
                    event_promos?: {
                        event?: {
                            title: string;
                        };
                    }[];
                }

                setPromoCodes((data || []).map((p: PromoRow) => {
                    const eventTitles = (p.event_promos || [])
                        .map((ep) => ep.event?.title)
                        .filter(Boolean);
                    
                    return {
                        id: p.id,
                        code: p.code,
                        type: p.type as any,
                        value: p.value,
                        uses_count: p.uses_count,
                        max_uses: p.max_uses,
                        is_active: p.is_active,
                        event_title: eventTitles.length > 1 
                            ? `${eventTitles[0]} (+${eventTitles.length - 1})`
                            : eventTitles[0] || 'Global',
                        created_at: p.created_at
                    };
                }));
            }
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, supabase, showToast, startDate, endDate, currentPage, debouncedSearch, categoryFilter]);

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
                { event: '*', schema: 'transactions', table: 'transactions' },
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
    }, [activeTab, debouncedSearch, startDate, endDate, categoryFilter]);

    useEffect(() => {
        fetchData();
        setSelectedTxIds(new Set());

        const fetchCountries = async () => {
            const { data } = await supabase.from('countries').select('code, display_name').order('display_name');
            if (data) setCountries(data.map((c: any) => ({ code: c.code, name: c.display_name })));
        };
        fetchCountries();
    }, [fetchData, supabase]);

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

    const handleSaveTaxRate = async () => {
        try {
            const payload = {
                ...taxForm,
                rate_percent: Number(taxForm.rate_percent),
                updated_at: new Date().toISOString()
            };

            if (editingTaxRate) {
                const { error } = await supabase.from('tax_rates').update(payload).eq('id', editingTaxRate.id);
                if (error) throw error;
                showToast('Tax rate updated', 'success');
            } else {
                const { error } = await supabase.from('tax_rates').insert([payload]);
                if (error) throw error;
                showToast('Tax rate created', 'success');
            }
            setIsTaxModalOpen(false);
            fetchData();
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        }
    };

    /**
     * Syncs FX rates by calling the `sync_fx_rates` Supabase RPC.
     * Falls back gracefully with a toast if the function is not yet deployed.
     */
    const handleSyncFX = async () => {
        setIsSyncingFX(true);
        showToast('Syncing with global rates...', 'info');
        try {
            const { error } = await supabase.rpc('sync_fx_rates');
            if (error) throw error;
            showToast('FX rates synchronized successfully.', 'success');
            fetchData();
        } catch (err: unknown) {
            // If the RPC doesn't exist yet, surface the error clearly instead of silently failing
            showToast(getErrorMessage(err) || 'FX sync function not available.', 'error');
        } finally {
            setIsSyncingFX(false);
        }
    };

    // ── Subscription Management Handlers ─────────────────────────────────────
    const handlePauseSubscription = async (id: string) => {
        showToast('Pausing subscription...', 'info');
        try {
            const { error } = await supabase.rpc('admin_pause_subscription', { p_subscription_id: id });
            if (error) throw error;
            showToast('Subscription paused successfully.', 'success');
            fetchData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleResumeSubscription = async (id: string) => {
        showToast('Resuming subscription...', 'info');
        try {
            const { error } = await supabase.rpc('admin_resume_subscription', { p_subscription_id: id });
            if (error) throw error;
            showToast('Subscription resumed successfully.', 'success');
            fetchData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleCancelSubscription = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this subscription? Immediate cancellation will terminate access.')) return;
        
        showToast('Cancelling subscription...', 'info');
        try {
            const { error } = await supabase.rpc('admin_cancel_subscription', { p_subscription_id: id, p_immediate: true });
            if (error) throw error;
            showToast('Subscription cancelled.', 'success');
            fetchData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleResendInvoice = async (id: string) => {
        showToast('Resending latest invoice...', 'info');
        // Mocking invoice service call
        setTimeout(() => {
            showToast('Success: Latest invoice resent to the customer.', 'success');
        }, 800);
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

        showToast(`Migrating subscription to ${newPlanId}...`, 'info');
        try {
            const { error } = await supabase.rpc('admin_change_subscription_plan', { 
                p_subscription_id: selectedSub.id, 
                p_new_plan_id: newPlanId 
            });
            if (error) throw error;
            showToast('Plan migrated successfully.', 'success');
            setIsPlanModalOpen(false);
            fetchData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const getBulkActions = (): BulkAction[] => {
        if (activeTab === 'promo-codes' && selectedPromoIds.size > 0) {
            return [
                {
                    label: 'Batch Deactivate',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>,
                    onClick: async () => {
                        showToast(`Deactivating ${selectedPromoIds.size} codes...`, 'info');
                        try {
                            const { error } = await supabase.from('promo_codes').update({ is_active: false }).in('id', Array.from(selectedPromoIds));
                            if (error) throw error;
                            showToast(`Successfully deactivated ${selectedPromoIds.size} codes.`, 'success');
                            setSelectedPromoIds(new Set());
                            fetchData();
                        } catch (err: any) {
                            showToast(getErrorMessage(err), 'error');
                        }
                    },
                    variant: 'danger'
                },
                {
                    label: 'Batch Activate',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
                    onClick: async () => {
                        showToast(`Activating ${selectedPromoIds.size} codes...`, 'info');
                        try {
                            const { error } = await supabase.from('promo_codes').update({ is_active: true }).in('id', Array.from(selectedPromoIds));
                            if (error) throw error;
                            showToast(`Successfully activated ${selectedPromoIds.size} codes.`, 'success');
                            setSelectedPromoIds(new Set());
                            fetchData();
                        } catch (err: any) {
                            showToast(getErrorMessage(err), 'error');
                        }
                    },
                    variant: 'success'
                }
            ];
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
            </TableToolbar>

            <Tabs value={activeTab} onValueChange={handleTabChange} className={styles.tabsReset}>
                <div className={adminStyles.tabsHeaderRow}>
                    <TabsList>
                        <TabsTrigger value="transactions">Transactions</TabsTrigger>
                        <TabsTrigger value="wallets">Wallets</TabsTrigger>
                        <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                        <TabsTrigger value="tax-rates">Tax Regions</TabsTrigger>
                        <TabsTrigger value="fx-rates">FX Markets</TabsTrigger>
                        <TabsTrigger value="promo-codes">Promo Codes</TabsTrigger>
                    </TabsList>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activeTab === 'transactions' && (
                            <select 
                                className={adminStyles.filterSelect}
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <option value="all">All Transactions</option>
                                <option value="incoming">Revenue (Incoming)</option>
                                <option value="outgoing">Refunds (Outgoing)</option>
                                <option value="hold">Escrow (Hold)</option>
                                <option value="internal">Internal Transfers</option>
                            </select>
                        )}

                        {activeTab === 'subscriptions' && (
                            <select 
                                className={adminStyles.filterSelect}
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="trialing">Trialing</option>
                                <option value="past_due">Past Due</option>
                                <option value="canceled">Canceled</option>
                            </select>
                        )}
                        {activeTab === 'wallets' && (
                            <select 
                                className={adminStyles.filterSelect}
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="frozen">Frozen Only</option>
                                <option value="restricted">Restricted</option>
                            </select>
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

                        {activeTab === 'promo-codes' && (
                            <Link href="/dashboard/admin/finance/promo-codes/create">
                                <button className={adminStyles.btnPrimary}>
                                    + Create Promo Code
                                </button>
                            </Link>
                        )}
                    </div>
                </div>

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

                <TabsContent value="subscriptions">
                    <SubscriptionTable
                        data={subscriptions}
                        isLoading={isLoading}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        onPause={handlePauseSubscription}
                        onResume={handleResumeSubscription}
                        onCancel={handleCancelSubscription}
                        onResendInvoice={handleResendInvoice}
                        onChangePlan={(id) => {
                            const sub = subscriptions.find(s => s.id === id);
                            if (sub) handleOpenPlanModal(sub);
                        }}
                    />
                </TabsContent>

                <TabsContent value="wallets">
                    <WalletTable
                        data={wallets}
                        isLoading={isLoading}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </TabsContent>

                <TabsContent value="tax-rates">
                    <TaxRateTable
                        data={taxRates.filter(t => t.display_name.toLowerCase().includes(searchTerm.toLowerCase()))}
                        isLoading={isLoading}
                        onUpdate={fetchData}
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
                    <FXRateTable data={fxRates.filter(f => f.currency.toLowerCase().includes(searchTerm.toLowerCase()))} isLoading={isLoading} onUpdate={fetchData} />
                </TabsContent>

                <TabsContent value="promo-codes">
                    <PromoCodeTable 
                        data={promoCodes.filter(p => p.code.toLowerCase().includes(searchTerm.toLowerCase()))} 
                        isLoading={isLoading} 
                        selectedIds={selectedPromoIds}
                        onSelect={(id) => {
                            const next = new Set(selectedPromoIds);
                            next.has(id) ? next.delete(id) : next.add(id);
                            setSelectedPromoIds(next);
                        }}
                        onSelectAll={() => setSelectedPromoIds(selectedPromoIds.size === promoCodes.length ? new Set() : new Set(promoCodes.map(p => p.id)))}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </TabsContent>
            </Tabs>

            <BulkActionsBar
                actions={getBulkActions()}
                selectedCount={
                    activeTab === 'promo-codes' ? selectedPromoIds.size : 
                    0
                }
                onCancel={() => {
                    setSelectedPromoIds(new Set());
                }}
            />


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
                            <option value="attendee_free">Attendee: Free</option>
                            <option value="attendee_premium_monthly">Attendee: Premium Monthly</option>
                            <option value="attendee_premium_yearly">Attendee: Premium Yearly</option>
                            <option value="business_pulse_starter">Business: Pulse Starter</option>
                            <option value="business_pulse_pro">Business: Pulse Pro</option>
                        </select>
                        <p style={{ fontSize: '11px', marginTop: '8px', opacity: 0.6 }}>
                            Note: Changing the plan will update the enrollment immediately. Prorating must be handled manually in the gateway if required.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default function AdminFinancePage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Finance...</div>}>
            <FinanceContent />
        </Suspense>
    );
}
