"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import FinanceTable from '@/components/organize/FinanceTable';
import PayoutTable, { Payout } from '@/components/admin/finance/PayoutTable';
import TaxRateTable from '@/components/admin/finance/TaxRateTable';
import FXRateTable from '@/components/admin/finance/FXRateTable';
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
import type { TaxRate, FXRate } from '@/types/admin';
import { exportToCSV } from '@/utils/export';

function FinanceContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const initialTab = searchParams.get('tab') || 'transactions';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isStatsLoading, setIsStatsLoading] = useState(true);

    // Date range state
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // State for different datasets
    const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
    const [fxRates, setFxRates] = useState<FXRate[]>([]);

    // Selection state
    const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
    const [selectedPayoutIds, setSelectedPayoutIds] = useState<Set<string>>(new Set());

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
        grossVolume: null,
        pendingPayouts: null,
        ticketRevenue: null,
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
            const [grossRes, payoutRes, ticketRes, adRes] = await Promise.all([
                supabase.from('transactions').select('amount').eq('status', 'completed'),
                supabase.from('payouts').select('amount').eq('status', 'requested'),
                supabase.from('transactions').select('amount').eq('reason', 'ticket_payment').eq('status', 'completed'),
                supabase.from('transactions').select('amount').eq('reason', 'ad_campaign_payment').eq('status', 'completed')
            ]);
    
            setGlobalStats({
                grossVolume: (grossRes.data || []).reduce((acc, t) => acc + Number(t.amount), 0),
                pendingPayouts: (payoutRes.data || []).reduce((acc, t) => acc + Number(t.amount), 0),
                ticketRevenue: (ticketRes.data || []).reduce((acc, t) => acc + Number(t.amount), 0),
                adRevenue: (adRes.data || []).reduce((acc, t) => acc + Number(t.amount), 0),
                payoutRequestCount: (payoutRes.data || []).length
            });
        } catch (error: any) {
            console.error('Error fetching global stats:', error);
        } finally {
            setIsStatsLoading(false);
        }
    }, [supabase]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (['transactions', 'refunds', 'ad_revenue', 'premium', 'escrow'].includes(activeTab)) {
                let query = supabase.from('transactions').select(`
                    *,
                    event:events(title),
                    sender:user_profile!sender_id(full_name, user_name),
                    recipient:user_profile!recipient_id(full_name, user_name)
                `);

                if (activeTab === 'refunds') {
                    query = query.in('reason', ['ticket_refund', 'ad_refund', 'ticket_refund']);
                } else if (activeTab === 'ad_revenue') {
                    query = query.eq('reason', 'ad_campaign_payment');
                } else if (activeTab === 'premium') {
                    query = query.eq('reason', 'premium_upsell');
                } else if (activeTab === 'escrow') {
                    query = query.eq('category', 'escrow');
                }

                if (startDate) {
                    query = query.gte('created_at', new Date(startDate).toISOString());
                }
                if (endDate) {
                    const d = new Date(endDate);
                    d.setHours(23, 59, 59, 999);
                    query = query.lte('created_at', d.toISOString());
                }

                const { data, error } = await query.order('created_at', { ascending: false });
                if (error) throw error;
                setTransactions((data || []).map(tx => ({
                    id: tx.id,
                    description: `${tx.reason.replace(/_/g, ' ')} for ${tx.event?.title || 'System'}`,
                    amount: tx.amount,
                    date: tx.created_at,
                    status: tx.status,
                    type: tx.reason,
                    category: tx.category,
                    reference: tx.reference,
                    event: tx.event?.title,
                    sender: tx.sender?.full_name || tx.sender?.user_name,
                    recipient: tx.recipient?.full_name || tx.recipient?.user_name
                })));
            } else if (activeTab === 'payouts') {
                let query = supabase.from('payouts').select(`
                    *,
                    account:accounts(display_name, is_verified),
                    business:business_profile!account_id(kyc_status)
                `);

                if (startDate) {
                    query = query.gte('created_at', new Date(startDate).toISOString());
                }
                if (endDate) {
                    const d = new Date(endDate);
                    d.setHours(23, 59, 59, 999);
                    query = query.lte('created_at', d.toISOString());
                }

                const { data, error } = await query.order('created_at', { ascending: false });

                if (error) throw error;
                setPayouts((data || []).map(p => ({
                    id: p.id,
                    recipient: p.account?.display_name || 'Unknown Account',
                    amount: p.amount,
                    status: p.status,
                    requestedAt: p.created_at || p.processed_at || new Date().toISOString(),
                    reference: p.reference,
                    notes: p.admin_notes,
                    kyc_status: (p.business as any)?.kyc_status as Payout['kyc_status'],
                    is_verified: p.account?.is_verified
                })));
            } else if (activeTab === 'tax-rates') {
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
            }
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, supabase, showToast, startDate, endDate]);

    useEffect(() => {
        fetchGlobalStats();
    }, [fetchGlobalStats]);

    useEffect(() => {
        fetchData();
        setSelectedTxIds(new Set());
        setSelectedPayoutIds(new Set());

        // Fetch countries for the dropdown
        const fetchCountries = async () => {
            const { data } = await supabase.from('countries').select('code, display_name').order('display_name');
            if (data) setCountries(data.map((c: any) => ({ code: c.code, name: c.display_name })));
        };
        fetchCountries();
    }, [fetchData, supabase]);

    /**
     * Exports the currently-loaded transactions to CSV.
     * Uses the shared exportToCSV utility for consistency with other dashboard exports.
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
            date: new Date(tx.date).toLocaleDateString(),
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
        if (activeTab === 'payouts' && selectedPayoutIds.size > 0) {
            return [
                {
                    label: 'Batch Approve',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
                    onClick: async () => {
                        showToast(`Approving ${selectedPayoutIds.size} payouts...`, 'info');
                        try {
                            const { error } = await supabase
                                .from('payouts')
                                .update({ status: 'processing', updated_at: new Date().toISOString() })
                                .in('id', Array.from(selectedPayoutIds));
                            if (error) throw error;
                            showToast('Batch approved — payouts marked as processing.', 'success');
                            setSelectedPayoutIds(new Set());
                            fetchData();
                        } catch (err: any) {
                            showToast(err.message || 'Failed to approve payouts.', 'error');
                        }
                    },
                    variant: 'success'
                }
            ];
        }
        return [];
    };

    const renderActiveTab = () => {
        if (activeTab === 'payouts') {
            return (
                <PayoutTable
                    payouts={payouts.filter(p => p.recipient.toLowerCase().includes(searchTerm.toLowerCase()))}
                    selectedIds={selectedPayoutIds}
                    onSelect={(id) => {
                        const next = new Set(selectedPayoutIds);
                        next.has(id) ? next.delete(id) : next.add(id);
                        setSelectedPayoutIds(next);
                    }}
                    onSelectAll={() => setSelectedPayoutIds(selectedPayoutIds.size === payouts.length ? new Set() : new Set(payouts.map(p => p.id)))}
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
                    label="Gross Volume" 
                    value={globalStats.grossVolume !== null ? `KES ${globalStats.grossVolume.toLocaleString()}` : null} 
                    change="All completed transactions"
                    trend="positive"
                    isLoading={isStatsLoading} 
                />
                <StatCard 
                    label="Pending Payouts" 
                    value={globalStats.pendingPayouts !== null ? `KES ${globalStats.pendingPayouts.toLocaleString()}` : null} 
                    change={globalStats.payoutRequestCount !== null ? `${globalStats.payoutRequestCount} active requests` : '...'}
                    trend="neutral"
                    isLoading={isStatsLoading} 
                />
                <StatCard 
                    label="Ticket Revenue" 
                    value={globalStats.ticketRevenue !== null ? `KES ${globalStats.ticketRevenue.toLocaleString()}` : null} 
                    change="Gross ticket sales"
                    trend="positive"
                    isLoading={isStatsLoading} 
                />
                <StatCard 
                    label="Ad Revenue" 
                    value={globalStats.adRevenue !== null ? `KES ${globalStats.adRevenue.toLocaleString()}` : null} 
                    change="Platform advertising"
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
                        { id: 'refunds', label: 'Refunds' },
                        { id: 'ad_revenue', label: 'Ad Revenue' },
                        { id: 'premium', label: 'Premium Upsells' },
                        { id: 'escrow', label: 'Escrow' },
                        { id: 'payouts', label: 'Payout Requests' },
                        { id: 'tax-rates', label: 'Tax Rates' },
                        { id: 'fx-rates', label: 'FX Rates' }
                    ]}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    className={styles.tabsReset}
                />
            </TableToolbar>

            {['transactions', 'ad_revenue', 'premium', 'refunds', 'payouts'].includes(activeTab) && (
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
