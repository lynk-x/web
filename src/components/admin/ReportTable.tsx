"use client";

import React from 'react';
import styles from './ReportTable.module.css';
import DataTable, { Column } from '../shared/DataTable';
import Badge, { BadgeVariant } from '../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString } from '@/utils/format';
import type { ActionItem } from '../shared/TableRowActions';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { Report } from '@/types/admin';
import type { Report } from '@/types/admin';

interface ReportTableProps {
    reports: Report[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

const getTypeVariant = (type: string): BadgeVariant => {
    switch (type) {
        case 'content': return 'primary';
        case 'bug': return 'warning';
        case 'user': return 'info';
        case 'system': return 'subtle';
        default: return 'neutral';
    }
};

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'open': return 'error';
        case 'in_review': return 'warning';
        case 'resolved': return 'success';
        case 'dismissed': return 'subtle';
        default: return 'neutral';
    }
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Admin report/moderation table.
 * Displays reports with type, details, status, and resolution actions.
 */
const ReportTable: React.FC<ReportTableProps> = ({
    reports,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const { showToast } = useToast();

    /** Column definitions for the report table. */
    const columns: Column<Report>[] = [
        {
            header: 'Type',
            render: (report) => <Badge label={formatString(report.type)} variant={getTypeVariant(report.type)} />,
        },
        {
            header: 'Report Details',
            render: (report) => (
                <div className={styles.reportInfo}>
                    <div className={styles.title}>{report.title}</div>
                    <div className={styles.description}>{report.description}</div>
                </div>
            ),
        },
        {
            header: 'Reporter',
            render: (report) => <div style={{ fontSize: '13px' }}>{report.reporter}</div>,
        },
        {
            header: 'Date',
            render: (report) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{report.date}</div>,
        },
        {
            header: 'Status',
            render: (report) => (
                <Badge label={formatString(report.status)} variant={getStatusVariant(report.status)} showDot />
            ),
        },
    ];

    /** Row-level moderation actions for each report. */
    const getActions = (report: Report): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'View Details',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => showToast('Opening report details...', 'info'),
            },
        ];

        if (report.status !== 'resolved') {
            actions.push({
                label: 'Mark Resolved',
                variant: 'success',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                onClick: () => {
                    showToast('Resolving report...', 'info');
                    setTimeout(() => showToast('Report marked as resolved.', 'success'), 1000);
                },
            });
        }

        if (report.status !== 'dismissed') {
            actions.push({
                label: 'Dismiss',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                onClick: () => {
                    showToast('Dismissing report...', 'info');
                    setTimeout(() => showToast('Report dismissed.', 'warning'), 1000);
                },
            });
        }

        if (report.type === 'user') {
            actions.push({
                label: 'Ban User',
                variant: 'danger',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>,
                onClick: () => {
                    showToast(`Banning user reported in ${report.id}...`, 'info');
                    setTimeout(() => showToast('User banned.', 'error'), 1500);
                },
            });
        }

        return actions;
    };

    return (
        <DataTable<Report>
            data={reports}
            columns={columns}
            getActions={getActions}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="No reports found matching criteria."
        />
    );
};

export default ReportTable;
