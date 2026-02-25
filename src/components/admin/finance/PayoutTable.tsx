"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/utils/format';
import type { ActionItem } from '../../shared/TableRowActions';
import type { Payout } from '@/types/organize';

// ─── Re-export type for page-level import convenience ────────────────────────

export type { Payout };

interface PayoutTableProps {
    payouts: Payout[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

/**
 * Maps `payout_status` schema enum values to badge colour variants.
 * requested | processing | completed | failed | rejected
 */
const getStatusVariant = (status: Payout['status']): BadgeVariant => {
    switch (status) {
        case 'completed': return 'success';
        case 'processing': return 'info';
        case 'requested': return 'warning';
        case 'failed': return 'error';
        case 'rejected': return 'subtle';
    }
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Admin payout management table.
 *
 * Backed by the `payouts` table with `payout_status` enum:
 *   requested → processing → completed / failed / rejected
 *
 * When wiring up:
 *   supabase.from('payouts')
 *     .select('*, profile:profiles!profile_id(display_name)')
 *     .order('created_at', { ascending: false })
 */
const PayoutTable: React.FC<PayoutTableProps> = ({
    payouts,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const { showToast } = useToast();
    const router = useRouter();

    /** Column definitions for the payout table. */
    const columns: Column<Payout>[] = [
        {
            header: 'Reference',
            render: (payout) => (
                <span style={{ fontFamily: 'monospace', fontSize: '12px', opacity: 0.7 }}>
                    {payout.reference ?? '—'}
                </span>
            ),
        },
        {
            header: 'Recipient',
            render: (payout) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{payout.recipient}</div>
                    {payout.notes && (
                        // Admin note — e.g. KYC incomplete, bank details invalid
                        <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>{payout.notes}</div>
                    )}
                </div>
            ),
        },
        {
            header: 'Amount',
            render: (payout) => (
                <span style={{ fontWeight: 600 }}>{formatCurrency(payout.amount)}</span>
            ),
        },
        {
            header: 'Requested',
            render: (payout) => (
                <span style={{ fontSize: '13px', opacity: 0.8 }}>{payout.requestedAt}</span>
            ),
        },
        {
            header: 'Status',
            render: (payout) => (
                <Badge label={payout.status} variant={getStatusVariant(payout.status)} showDot />
            ),
        },
    ];

    /** Row-level actions for each payout request. */
    const getActions = (payout: Payout): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'View Details',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => router.push(`/dashboard/admin/finance/payout/${payout.id}`),
            },
        ];

        // Only `requested` payouts can be approved or rejected
        if (payout.status === 'requested') {
            actions.push(
                {
                    label: 'Approve',
                    variant: 'success',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                    onClick: () => {
                        showToast(`Processing payout ${payout.reference}...`, 'info');
                        setTimeout(() => showToast('Payout approved and set to processing.', 'success'), 1200);
                    },
                },
                {
                    label: 'Reject',
                    variant: 'danger',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                    onClick: () => {
                        showToast(`Rejecting ${payout.reference}...`, 'info');
                        setTimeout(() => showToast('Payout rejected.', 'error'), 1000);
                    },
                }
            );
        }

        // Failed payouts can be retried
        if (payout.status === 'failed') {
            actions.push({
                label: 'Retry',
                variant: 'default',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>,
                onClick: () => {
                    showToast(`Retrying payout ${payout.reference}...`, 'info');
                    setTimeout(() => showToast('Retry queued.', 'success'), 1000);
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
            emptyMessage="No payout requests found matching criteria."
        />
    );
};

export default PayoutTable;
