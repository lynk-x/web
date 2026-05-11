"use client";

import React from 'react';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { formatString } from '@/utils/format';
import type { ActionItem } from '../../shared/TableRowActions';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { Invoice } from '@/types/ads';
import type { Invoice } from '@/types/ads';

interface AdsInvoiceTableProps {
    invoices: Invoice[];
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'paid': return 'success';
        case 'pending': return 'warning';
        case 'overdue': return 'error';
        default: return 'neutral';
    }
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Ads billing invoice table.
 * Displays invoice dates, amounts, payment status, and download/view actions.
 */
const AdsInvoiceTable: React.FC<AdsInvoiceTableProps> = ({
    invoices,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const { showToast } = useToast();
    const router = useRouter();

    /** Column definitions for the invoice table. */
    const columns: Column<Invoice>[] = [
        {
            header: 'Date',
            render: (invoice) => <div>{invoice.date}</div>,
        },
        {
            header: 'Amount',
            render: (invoice) => <div>{invoice.amount}</div>,
        },
        {
            header: 'Status',
            render: (invoice) => (
                <Badge
                    label={formatString(invoice.status)}
                    variant={getStatusVariant(invoice.status)}
                    showDot
                />
            ),
        },
    ];

    /** Row-level actions for each invoice. */
    const getActions = (invoice: Invoice): ActionItem[] => [
        {
            label: 'Print / Save PDF',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>,
            onClick: () => {
                // Navigate to invoice detail page which has a native print button
                router.push(`/dashboard/ads/finance/invoices/${invoice.id}`);
            }
        },
        {
            label: 'View Details',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
            onClick: () => router.push(`/dashboard/ads/finance/invoices/${invoice.id}`)
        }
    ];

    return (
        <DataTable<Invoice>
            data={invoices}
            columns={columns}
            getActions={getActions}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="No invoices found."
        />
    );
};

export default AdsInvoiceTable;
