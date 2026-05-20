"use client";

import React from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString, formatCurrency, formatDate } from '@/utils/format';
import type { ActionItem } from '@/components/shared/TableRowActions';

interface Refund {
    id: string;
    reference: string;
    event_name: string;
    ticket_code: string;
    amount: number;
    currency: string;
    status: 'pending' | 'approved' | 'rejected' | 'processed';
    created_at: string;
    processed_at?: string;
}

interface RefundTableProps {
    refunds: Refund[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    isLoading?: boolean;
}

const getRefundStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'processed': return 'success';
        case 'approved':  return 'success';
        case 'pending':   return 'warning';
        case 'rejected':  return 'error';
        default:           return 'neutral';
    }
};

const RefundTable: React.FC<RefundTableProps> = ({
    refunds,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    isLoading = false,
}) => {
    const { showToast } = useToast();

    const columns: Column<Refund>[] = [
        {
            header: 'Reference',
            render: (refund, _idx) => (
                <span style={{ fontFamily: 'monospace', fontSize: '12px', opacity: 0.7 }}>
                    {refund.reference || '—'}
                </span>
            ),
        },
        {
            header: 'Event',
            render: (refund, _idx) => (
                <div style={{ fontWeight: 500, fontSize: '13px' }}>{refund.event_name || '—'}</div>
            ),
        },
        {
            header: 'Ticket Code',
            render: (refund, _idx) => (
                <span style={{ fontSize: '13px', fontFamily: 'monospace', opacity: 0.8 }}>
                    {refund.ticket_code || '—'}
                </span>
            ),
        },
        {
            header: 'Amount',
            render: (refund, _idx) => (
                <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {formatCurrency(refund.amount, refund.currency)}
                </div>
            ),
        },
        {
            header: 'Status',
            render: (refund, _idx) => (
                <Badge label={formatString(refund.status)} variant={getRefundStatusVariant(refund.status)} showDot />
            ),
        },
        {
            header: 'Requested',
            render: (refund, _idx) => (
                <span style={{ fontSize: '13px', opacity: 0.8 }}>{formatDate(refund.created_at)}</span>
            ),
        },
    ];

    const getActions = (refund: Refund): ActionItem[] => [
        {
            label: 'View Details',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
            onClick: () => showToast('Refund details not yet available.', 'warning'),
        },
        ...(refund.status === 'pending'
            ? [
                  {
                      label: 'Approve',
                      variant: 'success' as const,
                      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                      onClick: () => showToast('Refund approval not yet available.', 'warning'),
                  },
                  {
                      label: 'Reject',
                      variant: 'danger' as const,
                      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                      onClick: () => showToast('Refund rejection not yet available.', 'warning'),
                  },
              ]
            : []),
    ];

    return (
        <DataTable<Refund>
            data={refunds}
            columns={columns}
            getActions={getActions}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            isLoading={isLoading}
            emptyMessage="No refund requests found."
        />
    );
};

export default RefundTable;
