"use client";

import React from 'react';
import styles from './FinanceTable.module.css';
import TableCheckbox from '../shared/TableCheckbox';
import Badge, { BadgeVariant } from '../shared/Badge';
import TableRowActions, { ActionItem } from '../shared/TableRowActions';
import Pagination from '../shared/Pagination';
import { useToast } from '@/components/ui/Toast';

export interface FinanceTransaction {
    id: string;
    event?: string; // Optional for admin view, required for organizer view if needed
    date: string;
    description: string;
    amount: number | string; // Allow string for formatted values in mock data
    type: 'payout' | 'refund' | 'fee' | 'subscription' | 'Ticket Sale' | 'Vendor Fee' | 'Sponsorship';
    status: 'completed' | 'pending' | 'failed' | 'processing' | 'Completed' | 'Pending';
    referenceId?: string;
}

interface FinanceTableProps {
    transactions: FinanceTransaction[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const FinanceTable: React.FC<FinanceTableProps> = ({
    transactions,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange
}) => {
    const { showToast } = useToast();
    const getStatusVariant = (status: string): BadgeVariant => {
        switch (status) {
            case 'completed': return 'success';
            case 'pending': return 'warning';
            case 'failed': return 'error';
            case 'processing': return 'info';
            default: return 'neutral';
        }
    };

    const getTypeVariant = (type: string): BadgeVariant => {
        switch (type) {
            case 'subscription': return 'primary';
            case 'payout': return 'success';
            case 'refund': return 'warning';
            case 'fee': return 'neutral';
            default: return 'neutral';
        }
    };

    const formatCurrency = (amount: number | string, type: string) => {
        const isNegative = type === 'payout' || type === 'refund' || type === 'Refund';
        const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : amount;
        const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(numAmount));
        return isNegative ? `-${formatted}` : `+${formatted}`;
    };

    const formatString = (str: string) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const allSelected = transactions.length > 0 && selectedIds?.size === transactions.length;
    const isIndeterminate = (selectedIds?.size || 0) > 0 && !allSelected;

    const getTransactionActions = (tx: FinanceTransaction): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'View Details',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => showToast(`Opening transaction ${tx.id}...`, 'info')
            }
        ];

        if (tx.status === 'pending') {
            actions.push({
                label: 'Approve',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                onClick: () => {
                    showToast(`Approving transaction ${tx.id}...`, 'info');
                    setTimeout(() => showToast('Transaction approved.', 'success'), 1000);
                },
                variant: 'success'
            });
            actions.push({
                label: 'Reject',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                onClick: () => {
                    showToast(`Rejecting transaction ${tx.id}...`, 'info');
                    setTimeout(() => showToast('Transaction rejected.', 'error'), 1000);
                },
                variant: 'danger'
            });
        }

        return actions;
    };

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{ width: '40px' }}>
                            <TableCheckbox
                                checked={allSelected}
                                onChange={() => onSelectAll && onSelectAll()}
                                indeterminate={isIndeterminate}
                                disabled={!onSelectAll}
                            />
                        </th>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((tx) => (
                        <tr key={tx.id} className={selectedIds?.has(tx.id) ? styles.rowSelected : ''}>
                            <td>
                                <TableCheckbox
                                    checked={selectedIds?.has(tx.id) || false}
                                    onChange={() => onSelect && onSelect(tx.id)}
                                />
                            </td>
                            <td>
                                <div style={{ fontSize: '13px' }}>{tx.date}</div>
                            </td>
                            <td>
                                <div className={styles.transactionInfo}>
                                    <span className={styles.description}>{tx.description}</span>
                                    {tx.referenceId && <span className={styles.meta}>Ref: {tx.referenceId}</span>}
                                </div>
                            </td>
                            <td>
                                <Badge
                                    label={formatString(tx.type)}
                                    variant={getTypeVariant(tx.type)}
                                />
                            </td>
                            <td>
                                <span className={`${styles.amount} ${tx.type === 'payout' || tx.type === 'refund' ? styles.amountNegative : styles.amountPositive}`}>
                                    {formatCurrency(tx.amount, tx.type)}
                                </span>
                            </td>
                            <td>
                                <Badge
                                    label={formatString(tx.status)}
                                    variant={getStatusVariant(tx.status)}
                                    showDot
                                />
                            </td>
                            <td>
                                <div className={styles.actions}>
                                    <TableRowActions actions={getTransactionActions(tx)} />
                                </div>
                            </td>
                        </tr>
                    ))}
                    {transactions.length === 0 && (
                        <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '32px', opacity: 0.5 }}>
                                No transactions found matching criteria.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {onPageChange && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                />
            )}
        </div>
    );
};

export default FinanceTable;
