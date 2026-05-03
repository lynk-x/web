"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';
import adminStyles from '../page.module.css';
import FinanceTable from '@/components/features/finance/FinanceTable';
import PayoutTable, { Payout } from '@/components/admin/finance/PayoutTable';
import TaxRateTable from '@/components/admin/finance/TaxRateTable';
import FXRateTable from '@/components/admin/finance/FXRateTable';
import PromoCodeTable from '@/components/admin/finance/PromoCodeTable';
import TableToolbar from '@/components/shared/TableToolbar';
import DateRangeRow from '@/components/shared/DateRangeRow';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import Modal from '@/components/shared/Modal';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import Tabs from '@/components/dashboard/Tabs';
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
    const initialTab = searchParams.get('tab') || 'transactions';
    const [activeTab, setActiveTab] = useState(initialTab);
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
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
    const [fxRates, setFxRates] = useState<FXRate[]>([]);
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);

    // Selection state
    const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
    const [selectedPayoutIds, setSelectedPayoutIds] = useState<Set<string>>(new Set());

    // Payout rejection modal state
    const [isPayoutRejectModalOpen, setIsPayoutRejectModalOpen] = useState(false);
    const [pendingRejectPayout, setPendingRejectPayout] = useState<Payout | null>(null);

    // Tax Modal state
    const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
    const [editingTaxRate, setEditingTaxRate] = useState<TaxRate | null>(null);
    const [taxForm, setTaxForm] = useState({
        name: '',
        country_code: 'KE',
        rate_percent: 0,
        is_inclusive: true
    });
    const [countries, setCountries] = useState<{ code: string, name: string }[]>([]);

    // FX State
    const [isSyncingFX, setIsSyncingFX] = useState(false);

    // Global Stats state
    const [globalStats, setGlobalStats] = useState<any>({
        platformRevenue: null,
        pendingPayouts: null,
        ticketCommission: null,
        adRevenue: null,
        payoutRequestCount: null
    });

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) {
            setActiveTab(tab as typeof activeTab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const fetchGlobalStats = useCallback(async () => {
        setIsStatsLoading(true);
        try {
            const [statsRes, adsRes] = await Promise.all([
                supabase.rpc('admin_stat_summary'),
                supabase.from('ad_campaigns').select('spent_amount').is('deleted_at', null)
            ]);

            if (statsRes.error) throw statsRes.error;
            const data = statsRes.data;
            const adSpend = (adsRes.data || []).reduce((acc: number, c: any) => acc + Number(c.spent_amount || 0), 0);
    
            setGlobalStats({
                platformRevenue: data.commission_volume + adSpend,
                pendingPayouts: data.pending_payouts,
                ticketCommission: data.commission_volume,
                payoutRequestCount: data.payout_count,
                adRevenue: adSpend
            });
        } catch (error: any) {
            showToast('Failed to load financial aggregates.', 'error');
        } finally {
            setIsStatsLoading(false);
        }
    }, [supabase, showToast]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            if (['transactions', 'refunds', 'revenue', 'escrow'].includes(activeTab)) {
                let query = supabase
                    .schema('transactions')
                    .from('transactions')
                    .select(`
                    *,
                    event:events(title),
                    initiator:user_profile!initiated_by(full_name, user_name),
                    recipient_account:accounts!recipient_account_id(display_name)
                `, { count: 'exact' });

                if (activeTab === 'refunds') {
                    query = query.in('reason', ['ticket_refund', 'ad_refund']);
                } else if (activeTab === 'revenue') {
                    query = query.in('reason', ['ticket_sale', 'ad_campaign_payment', 'subscription_payment']);
                } else if (activeTab === 'escrow') {
                    query = query.eq('category', 'hold');
                }

                if (startDate) {
                    query = query.gte('created_at', new Date(startDate).toISOString());
                }
                if (endDate) {
                    const d = new Date(endDate);
                    d.setHours(23, 59, 59, 999);
                    query = query.lte('created_at', d.toISOString());
                }

                if (debouncedSearch) {
                    query = query.ilike('reference', `%${debouncedSearch}%`);
                }

                const { data, error, count } = await query
                    .order('created_at', { ascending: false })
                    .range(from, to);

                if (error) throw error;
                setTotalCount(count || 0);

                setTransactions((data || []).map(tx => ({
                    id: tx.id,
                    description: `${tx.reason.replace(/_/g, ' ')} for ${tx.event?.title || 'System'}`,
                    amount: tx.amount,
                    date: tx.created_at || new Date().toISOString(),
                    status: tx.status,
                    type: tx.reason,
                    category: tx.category,
                    reference: tx.reference,
                    event: tx.event?.title,
                    sender: tx.initiator?.full_name || tx.initiator?.user_name,
                    recipient: tx.recipient_account?.display_name
                })));
            } else if (activeTab === 'payouts') {
                let query = supabase
                    .schema('payouts')
                    .from('payouts')
                    .select(`
                    *,
                    account:accounts(display_name),
                    verifications:identity_verifications!account_id(status)
                `, { count: 'exact' });

                if (startDate) {
                    query = query.gte('created_at', new Date(startDate).toISOString());
                }
                if (endDate) {
                    const d = new Date(endDate);
                    d.setHours(23, 59, 59, 999);
                    query = query.lte('created_at', d.toISOString());
                }

                if (debouncedSearch) {
                    query = query.ilike('reference', `%${debouncedSearch}%`);
                }

                const { data, error, count } = await query
                    .order('created_at', { ascending: false })
                    .range(from, to);

                if (error) throw error;
                setTotalCount(count || 0);

                setPayouts((data || []).map(p => ({
                    id: p.id,
                    recipient: p.account?.display_name || 'Unknown Account',
                    amount: p.amount,
                    status: p.status,
                    requestedAt: p.created_at || p.processed_at || new Date().toISOString(),
                    reference: p.reference,
                    bankName: p.channel_metadata?.target?.bank_name || 'M-Pesa',
                    type: p.method,
                    notes: (p as any).admin_notes,
                    kyc_status: (p.verifications as any)?.[0]?.status || 'pending',
                    is_verified: (p.verifications as any)?.[0]?.status === 'approved'
                })));
            } else if (activeTab === 'tax-rates') {
                // ... Tax rates, fx rates, etc. usually stay small and don't require server-side scaling
                const { data, error } = await supabase.from('tax_rates').select(`
                    *,
                    country:countries(display_name)
                `).order('name');
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
                setPromoCodes((data || []).map((p: any) => {
                    const eventTitles = (p.event_promos || [])
                        .map((ep: any) => ep.event?.title)
                        .filter(Boolean);
                    
                    return {
                        id: p.id,
                        code: p.code,
                        type: p.type,
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
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, supabase, showToast, startDate, endDate]);

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
                    if (['transactions', 'revenue', 'refunds', 'escrow'].includes(activeTabRef.current)) {
                        fetchDataRef.current();
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'payouts', table: 'payouts' },
                () => {
                    if (activeTabRef.current === 'payouts') fetchDataRef.current();
                    fetchGlobalStatsRef.current();
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

    // Pagination Reset Logic: Resolves Part 2 audit item #2
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, debouncedSearch, startDate, endDate]);

    useEffect(() => {
        fetchData();
        setSelectedTxIds(new Set());
        setSelectedPayoutIds(new Set());

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
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    // ── Payout Lifecycle Handlers ───────────────────────────────────────────
    const handleApprovePayout = async (payout: Payout) => {
        // KYC Gate: Resolves Part 2 audit item #1
        if (!payout.is_verified) {
            showToast(`Critical Block: Recipient identity is NOT verified. Approve KYC first.`, 'error');
            return;
        }

        showToast(`Triggering disbursement for ${payout.reference}...`, 'info');
        try {
            const { data, error } = await supabase.functions.invoke('payout-gateway-v1', {
                body: { payout_id: payout.id }
            });
            
            if (error || !data?.success) {
                throw new Error(error?.message || data?.error || 'Failed to initiate payout');
            }
            
            showToast('Payout successfully initiated.', 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleRejectPayout = (payout: Payout) => {
        setPendingRejectPayout(payout);
        setIsPayoutRejectModalOpen(true);
    };

    const confirmRejectPayout = async (reason: string) => {
        const isBulk = !pendingRejectPayout;
        const count = isBulk ? selectedPayoutIds.size : 1;
        
        showToast(`Rejecting ${count} payout(s)...`, 'info');
        try {
            if (isBulk) {
                const { error } = await supabase.rpc('bulk_reject_payouts', {
                    p_payout_ids: Array.from(selectedPayoutIds),
                    p_reason: reason
                });
                if (error) throw error;
                setSelectedPayoutIds(new Set());
            } else {
                const { error } = await supabase.rpc('reject_payout', {
                    p_payout_id: pendingRejectPayout.id,
                    p_reason: reason
                });
                if (error) throw error;
            }

            showToast(`${count > 1 ? 'Payouts' : 'Payout'} rejected and funds returned to escrow.`, 'success');
            setIsPayoutRejectModalOpen(false);
            setPendingRejectPayout(null);
            fetchData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleRetryPayout = async (payout: Payout) => {
        // Retrying is the same as re-attempting approval via the gateway
        handleApprovePayout(payout);
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
        } catch (err: any) {
            // If the RPC doesn't exist yet, surface the error clearly instead of silently failing
            showToast(err.message || 'FX sync function not available.', 'error');
        } finally {
            setIsSyncingFX(false);
        }
    };

    const getBulkActions = (): BulkAction[] => {
        if (activeTab === 'payouts' && selectedPayoutIds.size > 0 && isPayoutMgmtEnabled) {
            return [
                {
                    label: 'Batch Approve',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
                    onClick: async () => {
                        showToast(`Initiating background processing for ${selectedPayoutIds.size} payouts...`, 'info');
                        try {
                            const { data, error } = await supabase.rpc('bulk_approve_payouts', {
                                p_payout_ids: Array.from(selectedPayoutIds)
                            });
                            if (error) throw error;
                            
                            if (data.processed_count === 0) {
                                showToast('No payouts were approved. Check if recipients are identity-verified.', 'warning');
                            } else {
                                showToast(`Successfully queued ${data.processed_count} payouts for background fulfillment.`, 'success');
                                fetchData();
                            }
                            setSelectedPayoutIds(new Set());
                        } catch (err: any) {
                            showToast(err.message || 'Failed to process bulk payout approval.', 'error');
                        }
                    },
                    variant: 'success'
                },
                {
                    label: 'Batch Reject',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>,
                    onClick: () => {
                        setIsPayoutRejectModalOpen(true);
                        setPendingRejectPayout(null); // Indicates bulk mode
                    },
                    variant: 'danger'
                }
            ];
        }
        return [];
    };
    
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const renderActiveTab = () => {
        if (activeTab === 'payouts') {
            return (
                <PayoutTable
                    payouts={payouts}
                    selectedIds={selectedPayoutIds}
                    onSelect={(id) => {
                        const next = new Set(selectedPayoutIds);
                        next.has(id) ? next.delete(id) : next.add(id);
                        setSelectedPayoutIds(next);
                    }}
                    onSelectAll={() => setSelectedPayoutIds(selectedPayoutIds.size === payouts.length ? new Set() : new Set(payouts.map(p => p.id)))}
                    onApprove={isPayoutMgmtEnabled ? handleApprovePayout : undefined}
                    onReject={isPayoutMgmtEnabled ? handleRejectPayout : undefined}
                    onRetry={isPayoutMgmtEnabled ? handleRetryPayout : undefined}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    isLoading={isLoading}
                />
            );
        }

        if (activeTab === 'tax-rates') {
            return (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                        <button className={adminStyles.btnPrimary} onClick={() => {
                            setEditingTaxRate(null);
                            setTaxForm({ name: '', country_code: 'KE', rate_percent: 0, is_inclusive: true });
                            setIsTaxModalOpen(true);
                        }}>
                            + Add Tax Rate
                        </button>
                    </div>
                    <TaxRateTable
                        data={taxRates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))}
                        isLoading={isLoading}
                        onUpdate={fetchData}
                        onEdit={(rate) => {
                            setEditingTaxRate(rate);
                            setTaxForm({
                                name: rate.name,
                                country_code: rate.country_code,
                                rate_percent: rate.rate_percent,
                                is_inclusive: rate.is_inclusive
                            });
                            setIsTaxModalOpen(true);
                        }}
                    />
                </>
            );
        }

        if (activeTab === 'fx-rates') {
            return (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
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
                    </div>
                    <FXRateTable data={fxRates.filter(f => f.currency.toLowerCase().includes(searchTerm.toLowerCase()))} isLoading={isLoading} onUpdate={fetchData} />
                </>
            );
        }

        if (activeTab === 'promo-codes') {
            return (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                        <Link href="/dashboard/admin/finance/promo-codes/create">
                            <button className={adminStyles.btnPrimary}>
                                + Create Promo Code
                            </button>
                        </Link>
                    </div>
                    <PromoCodeTable data={promoCodes.filter(p => p.code.toLowerCase().includes(searchTerm.toLowerCase()))} isLoading={isLoading} />
                </>
            );
        }

        return (
            <FinanceTable
                transactions={transactions.filter(tx => tx.description.toLowerCase().includes(searchTerm.toLowerCase()))}
                selectedIds={selectedTxIds}
                onSelect={(id) => {
                    const next = new Set(selectedTxIds);
                    next.has(id) ? next.delete(id) : next.add(id);
                    setSelectedTxIds(next);
                }}
                onSelectAll={() => setSelectedTxIds(selectedTxIds.size === transactions.length ? new Set() : new Set(transactions.map(t => t.id)))}
            />
        );
    };

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Finance"
                subtitle="Monitor platform revenue, manage payouts, and configure financial settings."
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
                    label="Platform Revenue" 
                    value={globalStats.platformRevenue !== null ? formatCurrency(globalStats.platformRevenue) : null} 
                    change="Combined platform income"
                    trend="positive"
                    isLoading={isStatsLoading} 
                />
                <StatCard 
                    label="Ticket Commission" 
                    value={globalStats.ticketCommission !== null ? formatCurrency(globalStats.ticketCommission) : null} 
                    change="5% of gross ticket sales"
                    trend="positive"
                    isLoading={isStatsLoading} 
                />
                <StatCard 
                    label="Ad Revenue" 
                    value={globalStats.adRevenue !== null ? formatCurrency(globalStats.adRevenue) : null} 
                    change="Advertising spend"
                    trend="neutral"
                    isLoading={isStatsLoading} 
                />
                <StatCard 
                    label="Pending Payouts" 
                    value={globalStats.pendingPayouts !== null ? formatCurrency(globalStats.pendingPayouts) : null} 
                    change={globalStats.payoutRequestCount !== null ? `${globalStats.payoutRequestCount} active requests` : '...'}
                    trend="neutral"
                    isLoading={isStatsLoading} 
                />
            </div>



            <TableToolbar
                searchPlaceholder="Search..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <Tabs
                    options={[
                        { id: 'transactions', label: 'All Transactions' },
                        { id: 'revenue', label: 'Revenue' },
                        { id: 'refunds', label: 'Refunds' },
                        { id: 'escrow', label: 'Escrow' },
                        { id: 'payouts', label: 'Payout Requests' },
                        { id: 'promo-codes', label: 'Promo Codes' },
                        { id: 'tax-rates', label: 'Tax Rates' },
                        { id: 'fx-rates', label: 'FX Rates' }
                    ]}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    className={styles.tabsReset}
                />
            </TableToolbar>

            {['transactions', 'revenue', 'refunds', 'payouts', 'escrow'].includes(activeTab) && (
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

            {renderActiveTab()}

            <BulkActionsBar
                actions={getBulkActions()}
                selectedCount={activeTab === 'payouts' ? selectedPayoutIds.size : 0}
                onCancel={() => {
                    setSelectedPayoutIds(new Set());
                }}
            />

            <RejectionModal
                isOpen={isPayoutRejectModalOpen}
                onClose={() => { setIsPayoutRejectModalOpen(false); setPendingRejectPayout(null); }}
                onConfirm={confirmRejectPayout}
                title="Reject Payout Request"
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
                            value={taxForm.name}
                            onChange={e => setTaxForm({ ...taxForm, name: e.target.value })}
                        />
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

export default function AdminFinancePage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Finance...</div>}>
            <FinanceContent />
        </Suspense>
    );
}
