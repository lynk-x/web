"use client";

import React from 'react';
import styles from './ReportTable.module.css';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString } from '@/utils/format';
import type { ActionItem } from '../../shared/TableRowActions';

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

/**
 * Maps the derived `targetType` field to a badge colour.
 * In the DB, this comes from whichever of the three target FK columns is non-null:
 *   target_user_id → 'user', target_event_id → 'event', target_message_id → 'message'
 */
const getTargetTypeVariant = (targetType: string): BadgeVariant => {
    switch (targetType) {
        case 'user': return 'error';   // User reports are high-sensitivity
        case 'event': return 'warning'; // Event reports need review
        case 'message': return 'info';    // Message/chat reports
        default: return 'neutral';
    }
};

/**
 * Maps `report_status` enum values to badge colours.
 * Schema enum: pending | investigating | resolved | dismissed
 */
const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'pending': return 'warning';
        case 'investigating': return 'info';
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
            // Derived from whichever target FK column is non-null in `reports` table
            header: 'Target Type',
            render: (report) => (
                <Badge
                    label={report.targetType.toUpperCase()}
                    variant={getTargetTypeVariant(report.targetType)}
                />
            ),
        },
        {
            header: 'Report Details',
            render: (report) => (
                <div className={styles.reportInfo}>
                    <div className={styles.title}>{report.title}</div>
                    <div className={styles.description}>{report.description}</div>
                    {report.reasonId && (
                        // reason_id FK references report_reasons table
                        <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>Reason: {report.reasonId}</div>
                    )}
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
            // report_status enum: pending | investigating | resolved | dismissed
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

        // Promote report to 'investigating' if it's still pending
        if (report.status === 'pending') {
            actions.push({
                label: 'Begin Investigation',
                variant: 'default',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
                onClick: () => {
                    showToast('Marking as investigating...', 'info');
                    setTimeout(() => showToast('Report status set to investigating.', 'info'), 1000);
                },
            });
        }

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

        // Ban User only available on reports targeting a user (targetType === 'user')
        if (report.targetType === 'user') {
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
