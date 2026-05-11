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
    isLoading?: boolean;
    getActions?: (report: Report) => ActionItem[];
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

const getTargetTypeVariant = (targetType: string): BadgeVariant => {
    switch (targetType) {
        case 'user': return 'error';
        case 'event': return 'warning';
        case 'message': return 'info';
        default: return 'neutral';
    }
};

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

const ReportTable: React.FC<ReportTableProps> = ({
    reports,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    isLoading = false,
    getActions: customGetActions,
}) => {
    const { showToast } = useToast();

    const columns: Column<Report>[] = [
        {
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
            render: (report) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{new Date(report.createdAt).toLocaleDateString()}</div>,
        },
        {
            header: 'Status',
            render: (report) => (
                <Badge label={formatString(report.status)} variant={getStatusVariant(report.status)} showDot />
            ),
        },
    ];

    const getActions = (report: Report): ActionItem[] => [
        {
            label: 'View Report',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
            onClick: () => showToast('Opening report details...', 'info'),
        },
        {
            label: `Manage ${report.targetType.charAt(0).toUpperCase() + report.targetType.slice(1)}`,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>,
            onClick: () => {
                showToast(`Navigating to manage ${report.targetType}...`, 'info');
            },
        },
    ];

    return (
        <DataTable<Report>
            data={reports}
            columns={columns}
            getActions={customGetActions || getActions}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            isLoading={isLoading}
            emptyMessage="No reports found matching criteria."
        />
    );
};

export default ReportTable;
