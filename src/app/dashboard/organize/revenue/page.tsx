"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import FinanceTable, { FinanceTransaction } from '@/components/organize/FinanceTable';
import PayoutTable from '@/components/organize/PayoutTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';

export default function OrganizerRevenuePage() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = createClient();

    const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
    const [payouts, setPayouts] = useState<any[]>([]); // Any for now, will map to Payout interface
    const [isLoading, setIsLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'transactions' | 'payouts'>('transactions');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Fetch Transactions
    const fetchTransactions = async () => {
        if (!activeAccount) return;
        setIsLoading(true);

        try {
            // First, get all event IDs for this account
            const { data: events, error: eventsError } = await supabase
                .from('events')
                .select('id, title')
                .eq('account_id', activeAccount.id);

            if (eventsError) throw eventsError;

            if (!events || events.length === 0) {
                setTransactions([]);
                return;
            }

            const eventIds = events.map(e => e.id);
            const eventMap = new Map(events.map(e => [e.id, e.title]));

            // Then, fetch transactions tied to these events
            const { data: txs, error: txError } = await supabase
                .from('transactions')
                .select('*')
                .in('event_id', eventIds)
                .order('created_at', { ascending: false });

            if (txError) throw txError;

            if (txs) {
                const mappedTxs: FinanceTransaction[] = txs.map(tx => ({
                    id: tx.id,
                    event: eventMap.get(tx.event_id) || 'Unknown Event',
                    description: tx.reason,
                    type: tx.category as any, // Mapped locally
                    amount: tx.amount,
                    status: tx.status,
                    date: new Date(tx.created_at).toLocaleDateString(),
                    reference: tx.reference
                }));
                setTransactions(mappedTxs);
            }

            // Also fetch Payouts for this account
            const { data: payoutData, error: payoutError } = await supabase
                .from('payouts')
                .select('*')
                .eq('account_id', activeAccount.id)
                .order('created_at', { ascending: false });

            if (payoutError) throw payoutError;

            if (payoutData) {
                const mappedPayouts = payoutData.map(p => ({
                    id: p.id,
                    recipient: p.account_name || activeAccount.name,
                    amount: p.amount,
                    status: p.status,
                    requestedAt: new Date(p.created_at).toLocaleDateString(),
                    reference: p.id.split('-')[0].toUpperCase(), // Simple ref generation from UUID
                    notes: p.admin_notes
                }));
                setPayouts(mappedPayouts);
            }

        } catch (error: any) {
            console.error("Error fetching financials:", error);
            showToast('Failed to load financial history.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isOrgLoading && activeAccount) {
            fetchTransactions();
        } else if (!isOrgLoading && !activeAccount) {
            setIsLoading(false);
            setTransactions([]);
            setPayouts([]);
        }
    }, [isOrgLoading, activeAccount]);

    const handleRequestPayout = async () => {
        if (!activeAccount) return;
        showToast('Processing payout request...', 'info');

        try {
            // For MVP, requesting a flat payout for demo purposes. 
            // In a real app, logic would sum unpaid transactions and prompt for details.
            const { error } = await supabase
                .from('payouts')
                .insert({
                    account_id: activeAccount.id,
                    amount: 5000,
                    method: 'Bank Transfer',
                    account_name: activeAccount.name,
                    account_number: 'PENDING-SETUP'
                });

            if (error) throw error;
            showToast('Payout request submitted securely.', 'success');
        } catch (error: any) {
            console.error("Payout error:", error);
            showToast(error.message || 'Failed to submit payout request.', 'error');
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
                <div className={styles.headerActions}>
                    <button className={styles.primaryBtn} onClick={handleRequestPayout}>
                        Request Payout
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabsContainer} style={{ borderBottom: '1px solid var(--color-interface-outline)', display: 'flex', gap: '24px', marginBottom: '24px', paddingBottom: '8px' }}>
                <button
                    onClick={() => { setActiveTab('transactions'); setCurrentPage(1); }}
                    style={{ background: 'none', border: 'none', color: activeTab === 'transactions' ? 'var(--color-brand-primary)' : 'var(--color-utility-primaryText)', fontSize: '15px', fontWeight: activeTab === 'transactions' ? 600 : 400, borderBottom: activeTab === 'transactions' ? '2px solid var(--color-brand-primary)' : 'none', paddingBottom: '8px', marginBottom: '-9px', cursor: 'pointer', opacity: activeTab === 'transactions' ? 1 : 0.7 }}
                >
                    Transactions
                </button>
                <button
                    onClick={() => { setActiveTab('payouts'); setCurrentPage(1); }}
                    style={{ background: 'none', border: 'none', color: activeTab === 'payouts' ? 'var(--color-brand-primary)' : 'var(--color-utility-primaryText)', fontSize: '15px', fontWeight: activeTab === 'payouts' ? 600 : 400, borderBottom: activeTab === 'payouts' ? '2px solid var(--color-brand-primary)' : 'none', paddingBottom: '8px', marginBottom: '-9px', cursor: 'pointer', opacity: activeTab === 'payouts' ? 1 : 0.7 }}
                >
                    Payouts
                </button>
            </div>

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
                                payouts={payouts}
                                selectedIds={selectedIds}
                                onSelect={handleSelect}
                                onSelectAll={handleSelectAll}
                                currentPage={1}
                                totalPages={1}
                                onPageChange={() => { }}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
