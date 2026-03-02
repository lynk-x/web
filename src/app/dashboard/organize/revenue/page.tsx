"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import FinanceTable, { FinanceTransaction } from '@/components/organize/FinanceTable';
import PayoutTable from '@/components/organize/PayoutTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import Tabs from '@/components/dashboard/Tabs';

function RevenueContent() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialTab = (searchParams.get('tab') as any) || 'transactions';
    const [activeTab, setActiveTab] = useState<'transactions' | 'payouts'>(
        ['transactions', 'payouts'].includes(initialTab) ? initialTab : 'transactions'
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as any;
        if (tab && ['transactions', 'payouts'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as any);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [payoutCurrentPage, setPayoutCurrentPage] = useState(1);
    const payoutItemsPerPage = 8;
    const itemsPerPage = 8;

    const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
    const [payouts, setPayouts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Payout request modal state
    const [payoutAmount, setPayoutAmount] = useState('');

    // ── fetchTransactions ──────────────────────────────────────────────────
    const fetchTransactions = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);

        try {
            // Get all event IDs for this account
            const { data: events, error: eventsError } = await supabase
                .from('events')
                .select('id, title')
                .eq('account_id', activeAccount.id);

            if (eventsError) throw eventsError;

            if (!events || events.length === 0) {
                setTransactions([]);
                setIsLoading(false);
                return;
            }

            const eventIds = events.map(e => e.id);
            const eventMap = new Map(events.map(e => [e.id, e.title]));

            const { data: txs, error: txError } = await supabase
                .from('transactions')
                .select('*')
                .in('event_id', eventIds)
                .order('created_at', { ascending: false });

            if (txError) throw txError;

            setTransactions((txs || []).map(tx => ({
                id: tx.id,
                event: eventMap.get(tx.event_id) || 'Unknown Event',
                description: tx.reason,
                type: tx.category as any,
                amount: tx.amount,
                status: tx.status,
                date: new Date(tx.created_at).toLocaleDateString(),
                reference: tx.reference
            })));

            // Payouts for this account
            const { data: payoutData, error: payoutError } = await supabase
                .from('payouts')
                .select('*')
                .eq('account_id', activeAccount.id)
                .order('created_at', { ascending: false });

            if (payoutError) throw payoutError;

            setPayouts((payoutData || []).map(p => ({
                id: p.id,
                recipient: activeAccount.name,
                amount: p.amount,
                status: p.status,
                requestedAt: new Date(p.created_at).toLocaleDateString(),
                reference: p.id.split('-')[0].toUpperCase(),
                notes: p.admin_notes
            })));

        } catch (err: any) {
            showToast(err.message || 'Failed to load financial history.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast]);

    // ── Effect ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOrgLoading && activeAccount) {
            fetchTransactions();
        } else if (!isOrgLoading && !activeAccount) {
            setIsLoading(false);
            setTransactions([]);
            setPayouts([]);
        }
    }, [isOrgLoading, activeAccount, fetchTransactions]);

    // ── Request Payout ────────────────────────────────────────────────────
    const handleRequestPayout = async () => {
        if (!activeAccount) return;
        const parsed = parseFloat(payoutAmount);
        if (!payoutAmount || isNaN(parsed) || parsed <= 0) {
            showToast('Please enter a valid payout amount.', 'error');
            return;
        }

        showToast('Submitting payout request…', 'info');
        try {
            const { error } = await supabase
                .from('payouts')
                .insert({
                    account_id: activeAccount.id,
                    amount: parsed,
                    method: 'Bank Transfer',
                    account_name: activeAccount.name,
                    account_number: 'PENDING-SETUP' // Organizer completes bank details separately
                });

            if (error) throw error;
            showToast('Payout request submitted. Our team will review it shortly.', 'success');
            setPayoutAmount('');
            fetchTransactions(); // Refresh payout list
        } catch (err: any) {
            showToast(err.message || 'Failed to submit payout request.', 'error');
        }
    };

    // Filter Logic
    const filteredTransactions = transactions.filter(tx => {
        const matchesSearch = (tx.event?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
            tx.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || tx.status.toLowerCase() === statusFilter;
        const matchesType = typeFilter === 'all' || tx.type.toLowerCase() === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Selection Logic
    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === paginatedTransactions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedTransactions.map(t => t.id)));
        }
    };

    return (
        <div className={styles.dashboardPage}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Revenue & Payouts</h1>
                    <p className={styles.pageSubtitle}>Track your earnings and transaction history.</p>
                </div>
                {/* Payout request: inline amount input + button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="number"
                        min="1"
                        placeholder="Amount (USD)"
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'inherit', width: '140px', fontSize: '14px' }}
                    />
                    <button className={styles.primaryBtn} onClick={handleRequestPayout}>
                        Request Payout
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs
                options={[
                    { id: 'transactions', label: 'Transactions' },
                    { id: 'payouts', label: 'Payouts' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {isLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Loading financials...</div>
            ) : transactions.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>No recorded transactions yet.</div>
            ) : (
                <>
                    {/* Toolbar */}
                    <TableToolbar
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder="Search transactions..."
                    >
                        <div className={styles.toolbarContainer}>
                            {['all', 'completed', 'pending', 'failed'].map((status) => {
                                const isActive = statusFilter === status;
                                return (
                                    <button
                                        key={status}
                                        onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                                        className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
                                    >
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </button>
                                );
                            })}
                        </div>

                        <div className={styles.filterGroup}>
                            <select
                                className={styles.filterSelect}
                                value={typeFilter}
                                onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="all">All Reasons</option>
                                <option value="ticket_sale">Ticket Sales</option>
                                <option value="subscription">Subscriptions</option>
                                <option value="ad_campaign_payment">Ad Payments</option>
                                <option value="organizer_payment">Organizer Payments</option>
                                <option value="ad_refund">Ad Refunds</option>
                                <option value="ticket_refund">Ticket Refunds</option>
                            </select>
                        </div>
                    </TableToolbar>

                    <div className={styles.tableWrapper}>
                        {activeTab === 'transactions' ? (
                            <FinanceTable
                                transactions={paginatedTransactions}
                                selectedIds={selectedIds}
                                onSelect={handleSelect}
                                onSelectAll={handleSelectAll}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        ) : (
                            <PayoutTable
                                payouts={payouts.slice((payoutCurrentPage - 1) * payoutItemsPerPage, payoutCurrentPage * payoutItemsPerPage)}
                                selectedIds={selectedIds}
                                onSelect={handleSelect}
                                onSelectAll={handleSelectAll}
                                currentPage={payoutCurrentPage}
                                totalPages={Math.ceil(payouts.length / payoutItemsPerPage)}
                                onPageChange={setPayoutCurrentPage}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default function OrganizerRevenuePage() {
    return (
        <Suspense fallback={<div className={styles.loading}>Loading Revenue...</div>}>
            <RevenueContent />
        </Suspense>
    );
}
