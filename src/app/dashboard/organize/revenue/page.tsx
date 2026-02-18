"use client";

import React, { useState } from 'react';
import styles from './page.module.css'; // Using local styles
import FinanceTable, { FinanceTransaction } from '@/components/organize/FinanceTable';
import TableToolbar from '@/components/shared/TableToolbar';
import Pagination from '@/components/shared/Pagination';
import { useToast } from '@/components/ui/Toast';

// Mock Data for Organizer Revenue
const mockTransactions: FinanceTransaction[] = [
    { id: 'TX-1001', event: 'Nairobi Tech Summit', description: 'Early Bird Ticket', type: 'Ticket Sale', amount: 'KES 2,500', status: 'Completed', date: 'Oct 12, 2025' },
    { id: 'TX-1002', event: 'Nairobi Tech Summit', description: 'Regular Ticket', type: 'Ticket Sale', amount: 'KES 2,500', status: 'Completed', date: 'Oct 12, 2025' },
    { id: 'TX-1003', event: 'Mombasa Music Fest', description: 'Food Vendor Slot', type: 'Vendor Fee', amount: 'KES 15,000', status: 'Pending', date: 'Nov 05, 2025' },
    { id: 'TX-1004', event: 'Kisumu Art Expo', description: 'Gold Sponsorship', type: 'Sponsorship', amount: 'KES 50,000', status: 'Completed', date: 'Dec 10, 2025' },
    { id: 'TX-1005', event: 'Nairobi Tech Summit', description: 'Ticket Refund', type: 'refund', amount: '-KES 2,500', status: 'Completed', date: 'Oct 13, 2025' },
];

export default function OrganizerRevenuePage() {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 2;

    // Filter Logic
    const filteredTransactions = mockTransactions.filter(tx => {
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
                    <button className={styles.primaryBtn} onClick={() => {
                        showToast('Processing payout request...', 'info');
                        setTimeout(() => showToast('Payout request submitted successfully.', 'success'), 1500);
                    }}>
                        Request Payout
                    </button>
                </div>
            </div>



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
                        <option value="all">All Types</option>
                        <option value="ticket sale">Ticket Sales</option>
                        <option value="vendor fee">Vendor Fees</option>
                        <option value="sponsorship">Sponsorships</option>
                        <option value="refund">Refunds</option>
                    </select>
                </div>
            </TableToolbar>

            {/* Table */}
            <div className={styles.tableWrapper}>
                <FinanceTable
                    transactions={paginatedTransactions}
                    selectedIds={selectedIds}
                    onSelect={handleSelect}
                    onSelectAll={handleSelectAll}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
}
