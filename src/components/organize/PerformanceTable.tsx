"use client";

import React from 'react';
import Link from 'next/link';
import styles from './PerformanceTable.module.css';
import DataTable, { Column } from '../shared/DataTable';
import Badge, { BadgeVariant } from '../shared/Badge';
import { formatCurrency } from '@/utils/format';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { PerformanceEvent } from '@/types/organize';
import type { PerformanceEvent } from '@/types/organize';

interface PerformanceTableProps {
    data: PerformanceEvent[];
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status.toLowerCase()) {
        case 'active': return 'success';
        case 'past': return 'neutral';
        case 'draft': return 'warning';
        default: return 'neutral';
    }
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Organizer event performance table.
 * Displays ticket sales, revenue, and status with a link out to analytics.
 * Note: Uses a Link action column instead of TableRowActions, so `getActions`
 * is not used — the action is rendered inline via a column definition.
 */
const PerformanceTable: React.FC<PerformanceTableProps> = ({
    data,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {
    /** Column definitions for the performance table. */
    const columns: Column<PerformanceEvent>[] = [
        {
            header: 'Event Name',
            render: (item) => <span className={styles.eventName}>{item.event}</span>,
        },
        {
            header: 'Tickets Sold',
            render: (item) => <div style={{ fontWeight: 500 }}>{item.ticketsSold}</div>,
        },
        {
            header: 'Revenue',
            render: (item) => <span className={styles.money}>{formatCurrency(item.totalRevenue)}</span>,
        },
        {
            header: 'Conversion',
            render: (item) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{item.conversionRate}</div>,
        },
        {
            header: 'Status',
            render: (item) => <Badge label={item.status} variant={getStatusVariant(item.status)} showDot />,
        },
        {
            header: 'Action',
            headerStyle: { textAlign: 'right' },
            render: (item) => (
                <div className={styles.actions}>
                    <Link href={`/dashboard/analytics/event/${item.id}`} className={styles.viewLink} title="View Insights">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10"></line>
                            <line x1="12" y1="20" x2="12" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                        </svg>
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <DataTable<PerformanceEvent>
            data={data}
            columns={columns}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="No data available."
        />
    );
};

export default PerformanceTable;
