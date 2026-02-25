"use client";

import React from 'react';
import styles from './FinanceTable.module.css';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '../shared/DataTable';
import Badge, { BadgeVariant } from '../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString, formatCurrency } from '@/utils/format';
import type { ActionItem } from '../shared/TableRowActions';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { FinanceTransaction } from '@/types/organize';
import type { FinanceTransaction } from '@/types/organize';

interface FinanceTableProps {
    transactions: FinanceTransaction[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

/** Maps `payment_status` enum to badge colour variants (all lowercase). */
const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'completed': return 'success';
        case 'pending': return 'warning';
        case 'failed': return 'error';
        case 'cancelled': return 'subtle';
        case 'refunded': return 'warning';
        default: return 'neutral';
    }
};

/**
 * Maps `transaction_reason` enum to badge colour variants.
 * All 10 schema values are handled explicitly.
 */
const getTypeVariant = (type: string): BadgeVariant => {
    switch (type) {
        case 'ticket_sale': return 'success';
        case 'subscription': return 'info';
        case 'ad_campaign_payment': return 'primary';
        case 'organizer_payment': return 'success';
        case 'ad_refund': return 'warning';
        case 'ticket_refund': return 'warning';
        case 'subscription_refund': return 'warning';
        case 'dispute_settlement': return 'error';
        case 'escrow_release': return 'neutral';
        case 'payout_withdrawal': return 'info';
        default: return 'neutral';
    }
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Organizer finance/revenue table.
 * Displays transaction details, amounts, types, and statuses.
 */
const FinanceTable: React.FC<FinanceTableProps> = ({
    transactions,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const { showToast } = useToast();
    const router = useRouter();

    /** Column definitions for the finance table. */
    const columns: Column<FinanceTransaction>[] = [
        {
            header: 'Transaction',
            render: (tx) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{tx.description}</div>
                    {(tx.reference || tx.referenceId) && (
                        <div style={{ fontSize: '12px', opacity: 0.5 }}>Ref: {tx.reference || tx.referenceId}</div>
                    )}
                    {tx.event && (
                        <div style={{ fontSize: '12px', opacity: 0.5 }}>{tx.event}</div>
                    )}
                </div>
            ),
        },
        {
            header: 'Type',
            render: (tx) => <Badge label={formatString(tx.type)} variant={getTypeVariant(tx.type)} />,
        },
        {
            header: 'Amount',
            render: (tx) => {
                const displayAmount = typeof tx.amount === 'string'
                    ? tx.amount
                    : formatCurrency(tx.amount);
                // Outgoing reasons are shown as negative amounts
                const isNegative = (
                    tx.type === 'ticket_refund' ||
                    tx.type === 'ad_refund' ||
                    tx.type === 'subscription_refund' ||
                    tx.type === 'dispute_settlement' ||
                    tx.type === 'payout_withdrawal'
                );
                return (
                    <div className={styles.amount} data-type={tx.type}>
                        {isNegative && typeof tx.amount === 'number'
                            ? `-${formatCurrency(tx.amount)}`
                            : displayAmount
                        }
                    </div>
                );
            },
        },
        {
            header: 'Date',
            render: (tx) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{tx.date}</div>,
        },
        {
            header: 'Status',
            render: (tx) => <Badge label={tx.status} variant={getStatusVariant(tx.status)} showDot />,
        },
    ];

    /** Row-level actions for each transaction. */
    const getActions = (tx: FinanceTransaction): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'View Invoice',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
                onClick: () => router.push(`/dashboard/admin/finance/invoice/${tx.id}`),
            },
        ];

        if (tx.status === 'pending' && tx.type === 'payout_withdrawal') {
            actions.push({
                label: 'Process Payout',
                variant: 'success',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                onClick: () => {
                    showToast('Processing payout...', 'info');
                    setTimeout(() => showToast('Payout processed successfully.', 'success'), 1500);
                },
            });
        }

        if (tx.type === 'ticket_sale' && tx.status === 'completed') {
            actions.push({
                label: 'Issue Refund',
                variant: 'danger',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>,
                onClick: () => {
                    showToast('Initiating refund...', 'info');
                    setTimeout(() => showToast('Refund processed.', 'warning'), 1500);
                },
            });
        }

        return actions;
    };

    return (
        <DataTable<FinanceTransaction>
            data={transactions}
            columns={columns}
            getActions={getActions}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="No transactions found matching criteria."
        />
    );
};

export default FinanceTable;
