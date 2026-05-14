"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/utils/format';
import type { ActionItem } from '../../shared/TableRowActions';
import type { Payout } from '@/types/organize';

// ─── Re-export type for page-level import convenience ────────────────────────

export type { Payout };

interface PayoutTableProps {
    payouts: Payout[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    onApprove?: (payout: Payout) => void;
    onReject?: (payout: Payout) => void;
    onRetry?: (payout: Payout) => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    isLoading?: boolean;
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
    onApprove,
    onReject,
    onRetry,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    isLoading = false,
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ fontWeight: 500 }}>{payout.recipient}</div>
                        {payout.is_verified && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-brand-primary)" style={{ flexShrink: 0 }}>
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
                            </svg>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Badge
                            label={(payout.kyc_status || 'pending').toUpperCase()}
                            variant={payout.kyc_status === 'approved' ? 'success' : 'neutral'}
                        />
                        {payout.kyc_tier && (
                            <Badge
                                label={payout.kyc_tier.replace(/_/g, ' ').toUpperCase()}
                                variant="subtle"
                            />
                        )}
                        {payout.notes && (
                            <div style={{ fontSize: '11px', opacity: 0.5 }}>{payout.notes}</div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            header: 'Amount',
            render: (payout) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(payout.amount, payout.currency)}</span>
                    {payout.reporting_amount && payout.reporting_currency && payout.reporting_currency !== payout.currency && (
                        <span style={{ fontSize: '11px', opacity: 0.5 }}>
                            {formatCurrency(payout.reporting_amount, payout.reporting_currency)}
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: 'Settlement Cause',
            render: (payout) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontWeight: 500, fontSize: '13px' }}>{payout.eventName || 'System Adjustment'}</div>
                    <div style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'monospace' }}>{payout.eventReference || 'N/A'}</div>
                    <div style={{ fontSize: '11px', opacity: 0.5, textTransform: 'capitalize' }}>{payout.type?.replace(/_/g, ' ')}</div>
                </div>
            ),
        },
        {
            header: 'Destination',
            render: (payout) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, opacity: 0.9 }}>{payout.wallet || '—'}</div>
                    <div style={{ fontSize: '11px', opacity: 0.5 }}>Internal Account Wallet</div>
                </div>
            ),
        },
        {
            header: 'Requested',
            render: (payout) => (
                <span style={{ fontSize: '13px', opacity: 0.8 }}>{formatDate(payout.requestedAt)}</span>
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
        const actions: ActionItem[] = [];

        // Only `requested` payouts can be approved or rejected
        if (payout.status === 'requested') {
            actions.push(
                {
                    label: 'Approve',
                    variant: 'success' as const,
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                    onClick: () => onApprove?.(payout),
                },
                {
                    label: 'Reject',
                    variant: 'danger' as const,
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                    onClick: () => onReject?.(payout),
                }
            );
        }

        actions.push({
            label: 'View Details',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
            onClick: () => router.push(`/dashboard/admin/finance/payout/${payout.id}?createdAt=${payout.createdAt}`),
        });

        // Failed payouts can be retried
        if (payout.status === 'failed') {
            actions.push({
                label: 'Retry',
                variant: 'default',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>,
                onClick: () => onRetry?.(payout),
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
            emptyMessage="No payout requests found matching criteria."
        />
    );
};

export default PayoutTable;
