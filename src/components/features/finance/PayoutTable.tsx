"use client";

import React from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString, formatCurrency, formatDate } from '@/utils/format';
import type { ActionItem } from '@/components/shared/TableRowActions';
import type { Payout } from '@/types/organize';

interface PayoutTableProps {
    payouts: Payout[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    isLoading?: boolean;
}

/** Maps `payout_status` schema enum values to badge colour variants. */
const getPayoutStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'completed': return 'success';
        case 'processing': return 'warning';
        case 'requested': return 'info';
        case 'hold':       return 'warning';
        case 'failed':     return 'error';
        case 'rejected':   return 'subtle';
        default:           return 'neutral';
    }
};

const PayoutTable: React.FC<PayoutTableProps> = ({
    payouts,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    isLoading = false,
}) => {
    const { showToast } = useToast();

    const columns: Column<Payout>[] = [
        {
            header: 'Reference',
            render: (payout, _idx) => (
                <span style={{ fontFamily: 'monospace', fontSize: '12px', opacity: 0.7 }}>
                    {payout.reference || '—'}
                </span>
            ),
        },
        {
            header: 'Event Name',
            render: (payout, _idx) => (
                <div style={{ fontWeight: 500, fontSize: '13px' }}>{payout.eventName || 'System Adjustment'}</div>
            ),
        },
        {
            header: 'Wallet Ref',
            render: (payout, _idx) => (
                <span style={{ fontSize: '13px', fontFamily: 'monospace', opacity: 0.8 }}>
                    {payout.payableWallet || payout.wallet || '—'}
                </span>
            ),
        },
        {
            header: 'Currency',
            render: (payout, _idx) => (
                <span style={{ fontWeight: 700, fontSize: '12px', opacity: 0.8 }}>
                    {payout.currency || '—'}
                </span>
            ),
        },
        {
            header: 'Amount',
            render: (payout, _idx) => (
                <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                    {formatCurrency(payout.amount, payout.currency)}
                </div>
            ),
        },
        {
            header: 'Settled At',
            render: (payout, _idx) => (
                <span style={{ fontSize: '13px', opacity: 0.8 }}>
                    {formatDate(payout.processedAt || payout.requestedAt)}
                </span>
            ),
        },
        {
            header: 'Status',
            render: (payout, _idx) => (
                <Badge label={formatString(payout.status)} variant={getPayoutStatusVariant(payout.status)} showDot />
            ),
        },
    ];

    const getActions = (payout: Payout): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'View Details',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
                onClick: () => {
                    showToast('Opening payout details...', 'info');
                },
            },
        ];

        if (payout.status === 'failed') {
            actions.push({
                label: 'Retry Payout',
                variant: 'success' as const,
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>,
                onClick: () => {
                    showToast('Retrying payout...', 'info');
                },
            });
        }

        return actions;
    };

    return (
        <DataTable<Payout>
            data={payouts}
            columns={columns}
            getActions={getActions}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            isLoading={isLoading}
            emptyMessage="No payouts found."
        />
    );
};

export default PayoutTable;
