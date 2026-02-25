"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import FinanceTable, { FinanceTransaction } from '@/components/organize/FinanceTable';

/**
 * Mock transactions — aligned to `transaction_reason` and `payment_status` schema enums.
 * When wiring up: `supabase.from('transactions').select('*').order('created_at', { ascending: false })`
 */
const mockTransactions: FinanceTransaction[] = [
    { id: '1', date: 'Oct 24, 2025', description: 'Premium Plan Subscription', amount: 49.00, type: 'subscription', category: 'incoming', status: 'completed', reference: 'SUB-8821' },
    { id: '2', date: 'Oct 23, 2025', description: 'Organiser Payout — EventPro Ltd', amount: 1250.00, type: 'payout_withdrawal', category: 'outgoing', status: 'pending', reference: 'PO-9921' },
    { id: '3', date: 'Oct 22, 2025', description: 'Ad Campaign #9921 Budget', amount: 500.00, type: 'ad_campaign_payment', category: 'incoming', status: 'completed', reference: 'AD-1123' },
    { id: '4', date: 'Oct 21, 2025', description: 'Ticket Refund — #8821 (User Req)', amount: 25.00, type: 'ticket_refund', category: 'outgoing', status: 'pending', reference: 'RF-4412' },
    { id: '5', date: 'Oct 20, 2025', description: 'Ticket Sale — Summer Festival', amount: 120.00, type: 'ticket_sale', category: 'incoming', status: 'completed', reference: 'TS-3321' },
    { id: '6', date: 'Oct 19, 2025', description: 'Organiser Payment — Jane Events', amount: 320.00, type: 'organizer_payment', category: 'outgoing', status: 'completed', reference: 'OP-9918' },
    { id: '7', date: 'Oct 18, 2025', description: 'Basic Plan Subscription', amount: 19.00, type: 'subscription', category: 'incoming', status: 'completed', reference: 'SUB-8819' },
    { id: '8', date: 'Oct 18, 2025', description: 'Subscription Refund — Double Chg', amount: 49.00, type: 'subscription_refund', category: 'outgoing', status: 'completed', reference: 'RF-4410' },
    { id: '9', date: 'Oct 17, 2025', description: 'Escrow Release — Event #4412', amount: 850.00, type: 'escrow_release', category: 'internal', status: 'completed', reference: 'ER-1001' },
    { id: '10', date: 'Oct 16, 2025', description: 'Dispute Settlement — User Claim', amount: 75.00, type: 'dispute_settlement', category: 'outgoing', status: 'completed', reference: 'DS-0021' },
];

/**
 * Mock payouts — aligned to `payouts` table + `payout_status` enum.
 * When wiring up: `supabase.from('payouts').select('*, profile:profiles!profile_id(display_name)').order('created_at', { ascending: false })`
 */
const mockPayouts: Payout[] = [
    { id: 'po-1', recipient: 'EventPro Ltd', amount: 1250.00, status: 'requested', requestedAt: 'Oct 23, 2025', reference: 'PO-9921' },
    { id: 'po-2', recipient: 'Jane Events', amount: 320.00, status: 'completed', requestedAt: 'Oct 19, 2025', reference: 'PO-9918' },
    { id: 'po-3', recipient: 'Global Beats', amount: 4200.00, status: 'processing', requestedAt: 'Oct 15, 2025', reference: 'PO-9901' },
    { id: 'po-4', recipient: 'Venture Hub', amount: 780.00, status: 'requested', requestedAt: 'Oct 10, 2025', reference: 'PO-9887' },
    { id: 'po-5', recipient: 'Chef Mario', amount: 230.00, status: 'failed', requestedAt: 'Oct 05, 2025', reference: 'PO-9870', notes: 'Bank account details invalid' },
    { id: 'po-6', recipient: 'TechDaily Org', amount: 1890.00, status: 'rejected', requestedAt: 'Sep 28, 2025', reference: 'PO-9855', notes: 'KYC not completed' },
];

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import type { Payout } from '@/types/organize';
import PayoutTable from '@/components/admin/finance/PayoutTable';

export default function AdminFinancePage() {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
    const [selectedPayoutIds, setSelectedPayoutIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [payoutPage, setPayoutPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic — tabs map to transaction_reason categories
    const filteredTransactions = mockTransactions.filter(tx => {
        const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tx.reference && tx.reference.toLowerCase().includes(searchTerm.toLowerCase()));

        let matchesTab = true;
        if (activeTab === 'payouts') matchesTab = tx.type === 'payout_withdrawal' || tx.type === 'organizer_payment';
        if (activeTab === 'refunds') matchesTab = tx.type === 'ticket_refund' || tx.type === 'ad_refund' || tx.type === 'subscription_refund';
        if (activeTab === 'fees') matchesTab = tx.type === 'subscription' || tx.type === 'ad_campaign_payment';

        return matchesSearch && matchesTab;
    });

    // Payout filter + pagination (backed by `payouts` table)
    const filteredPayouts = mockPayouts.filter((p: Payout) =>
        p.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.reference && p.reference.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const payoutTotalPages = Math.ceil(filteredPayouts.length / itemsPerPage);
    const paginatedPayouts = filteredPayouts.slice(
        (payoutPage - 1) * itemsPerPage,
        payoutPage * itemsPerPage
    );

    // Payout selection handlers
    const handleSelectPayout = (id: string) => {
        const next = new Set(selectedPayoutIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedPayoutIds(next);
    };
    const handleSelectAllPayouts = () => {
        if (selectedPayoutIds.size === paginatedPayouts.length) {
            setSelectedPayoutIds(new Set());
        } else {
            const next = new Set(selectedPayoutIds);
            paginatedPayouts.forEach(p => next.add(p.id));
            setSelectedPayoutIds(next);
        }
    };

    // Pagination Logic
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination when tab or search changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedTxIds(new Set());
    }, [activeTab, searchTerm]);

    // Selection Logic
    const handleSelectTx = (id: string) => {
        const newSelected = new Set(selectedTxIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedTxIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedTxIds.size === paginatedTransactions.length) {
            setSelectedTxIds(new Set());
        } else {
            const newSelected = new Set(selectedTxIds);
            paginatedTransactions.forEach(tx => newSelected.add(tx.id));
            setSelectedTxIds(newSelected);
        }
    };

    const handleBulkApprove = () => {
        showToast(`Approving ${selectedTxIds.size} transactions...`, 'info');
        setTimeout(() => {
            showToast('Transactions approved successfully.', 'success');
            setSelectedTxIds(new Set());
        }, 1000);
    };

    const handleBulkReject = () => {
        showToast(`Rejecting ${selectedTxIds.size} transactions...`, 'info');
        setTimeout(() => {
            showToast('Transactions rejected.', 'error');
            setSelectedTxIds(new Set());
        }, 1000);
    };

    const handleBulkExport = () => {
        showToast(`Preparing export for ${selectedTxIds.size} items...`, 'info');
        setTimeout(() => {
            showToast('Export ready! Downloading...', 'success');
            setSelectedTxIds(new Set());
        }, 1500);
    };

    const bulkActions: BulkAction[] = [
        { label: 'Approve Selected', onClick: handleBulkApprove, variant: 'success' },
        { label: 'Reject Selected', onClick: handleBulkReject, variant: 'danger' },
        { label: 'Export Selected', onClick: handleBulkExport }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={adminStyles.title}>Finance & Reports</h1>
                    <p className={adminStyles.subtitle}>Track revenue, payouts, and platform fees.</p>
                </div>
                <button className={adminStyles.btnSecondary} onClick={() => {
                    showToast('Generating financial report...', 'info');
                    setTimeout(() => showToast('Financial report downloaded successfully.', 'success'), 2000);
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export Report
                </button>
            </header>

            <div className={adminStyles.statsGrid}>
                <div className={adminStyles.statCard}>
                    <span className={adminStyles.statLabel}>Total Revenue (MTD)</span>
                    <span className={adminStyles.statValue}>$12,450.00</span>
                    <span className={`${adminStyles.statChange} ${adminStyles.positive}`}>+15% vs last month</span>
                </div>
                <div className={adminStyles.statCard}>
                    <span className={adminStyles.statLabel}>Pending Payouts</span>
                    <span className={adminStyles.statValue}>$3,200.00</span>
                    <span className={styles.statNote}>4 requests pending approval</span>
                </div>
                <div className={adminStyles.statCard}>
                    <span className={adminStyles.statLabel}>Refund Rate</span>
                    <span className={adminStyles.statValue}>1.2%</span>
                    <span className={styles.statNote}>Below industry average (2.0%)</span>
                </div>
            </div>

            <TableToolbar
                searchPlaceholder="Search transactions..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <div className={adminStyles.filterGroup}>
                    <div className={adminStyles.tabs} style={{ margin: 0 }}>
                        {['overview', 'payouts', 'refunds', 'fees'].map((tab) => (
                            <button
                                key={tab}
                                className={`${adminStyles.tab} ${activeTab === tab ? adminStyles.tabActive : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </TableToolbar>

            {/* ── Payouts Tab — backed by `payouts` table + payout_status enum ── */}
            {activeTab === 'payouts' ? (
                <>
                    <BulkActionsBar
                        selectedCount={selectedPayoutIds.size}
                        actions={[
                            { label: 'Approve Selected', onClick: () => { showToast(`Approving ${selectedPayoutIds.size} payouts...`, 'info'); setTimeout(() => { showToast('Payouts approved.', 'success'); setSelectedPayoutIds(new Set()); }, 1200); }, variant: 'success' },
                            { label: 'Reject Selected', onClick: () => { showToast(`Rejecting ${selectedPayoutIds.size} payouts...`, 'info'); setTimeout(() => { showToast('Payouts rejected.', 'error'); setSelectedPayoutIds(new Set()); }, 1000); }, variant: 'danger' },
                        ]}
                        onCancel={() => setSelectedPayoutIds(new Set())}
                        itemTypeLabel="payouts"
                    />
                    <PayoutTable
                        payouts={paginatedPayouts}
                        selectedIds={selectedPayoutIds}
                        onSelect={handleSelectPayout}
                        onSelectAll={handleSelectAllPayouts}
                        currentPage={payoutPage}
                        totalPages={payoutTotalPages}
                        onPageChange={setPayoutPage}
                    />
                </>
            ) : (
                /* ── Overview / Refunds / Fees — backed by `transactions` table ── */
                <>
                    <BulkActionsBar
                        selectedCount={selectedTxIds.size}
                        actions={bulkActions}
                        onCancel={() => setSelectedTxIds(new Set())}
                        itemTypeLabel="transactions"
                    />
                    <FinanceTable
                        transactions={paginatedTransactions}
                        selectedIds={selectedTxIds}
                        onSelect={handleSelectTx}
                        onSelectAll={handleSelectAll}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}
        </div>
    );
}
