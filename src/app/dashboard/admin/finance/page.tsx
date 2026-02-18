"use client";

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import FinanceTable, { FinanceTransaction } from '@/components/organize/FinanceTable';

// Mock Data
const mockTransactions: FinanceTransaction[] = [
    { id: '1', date: 'Oct 24, 2025', description: 'Monthly Subscription - Premium Plan', amount: 49.00, type: 'subscription', status: 'completed', referenceId: 'SUB-8821' },
    { id: '2', date: 'Oct 23, 2025', description: 'Payout to EventPro Ltd - Oct Earnings', amount: 1250.00, type: 'payout', status: 'pending', referenceId: 'PO-9921' },
    { id: '3', date: 'Oct 22, 2025', description: 'Ad Campaign #9921 Budget Deposit', amount: 500.00, type: 'fee', status: 'completed', referenceId: 'AD-1123' },
    { id: '4', date: 'Oct 21, 2025', description: 'Refund - Ticket #8821 (User Req)', amount: 25.00, type: 'refund', status: 'pending', referenceId: 'RF-4412' },
    { id: '5', date: 'Oct 20, 2025', description: 'Platform Fee - Event #4412', amount: 12.50, type: 'fee', status: 'completed', referenceId: 'FEE-3321' },
    { id: '6', date: 'Oct 19, 2025', description: 'Payout to Organizer Jane', amount: 320.00, type: 'payout', status: 'completed', referenceId: 'PO-9918' },
    { id: '7', date: 'Oct 18, 2025', description: 'Monthly Subscription - Basic Plan', amount: 19.00, type: 'subscription', status: 'completed', referenceId: 'SUB-8819' },
    { id: '8', date: 'Oct 18, 2025', description: 'Refund - Double Charge Adjustment', amount: 49.00, type: 'refund', status: 'completed', referenceId: 'RF-4410' },
];

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';

export default function AdminFinancePage() {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic
    const filteredTransactions = mockTransactions.filter(tx => {
        const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tx.referenceId && tx.referenceId.toLowerCase().includes(searchTerm.toLowerCase()));

        let matchesTab = true;
        if (activeTab === 'payouts') matchesTab = tx.type === 'payout';
        if (activeTab === 'refunds') matchesTab = tx.type === 'refund';
        if (activeTab === 'fees') matchesTab = tx.type === 'fee' || tx.type === 'subscription';

        return matchesSearch && matchesTab;
    });

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
                    <h1 className={adminStyles.title}>Financial Overview</h1>
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

            <BulkActionsBar
                selectedCount={selectedTxIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedTxIds(new Set())}
                itemTypeLabel="items"
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
        </div>
    );
}
