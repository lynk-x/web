"use client";

import React from 'react';
import styles from './ReportTable.module.css';
import adminStyles from '../../app/dashboard/admin/page.module.css';
import TableCheckbox from '../shared/TableCheckbox';
import Badge, { BadgeVariant } from '../shared/Badge';
import TableRowActions, { ActionItem } from '../shared/TableRowActions';
import Pagination from '../shared/Pagination';
import { useToast } from '@/components/ui/Toast';

export interface Report {
    id: string;
    type: 'content' | 'bug' | 'user' | 'system';
    title: string;
    description: string;
    date: string;
    reporter: string;
    status: 'open' | 'in_review' | 'resolved' | 'dismissed';
}

interface ReportTableProps {
    reports: Report[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const ReportTable: React.FC<ReportTableProps> = ({
    reports,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange
}) => {
    const { showToast } = useToast();
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

    const formatString = (str: string) => {
        return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const allSelected = reports.length > 0 && selectedIds?.size === reports.length;
    const isIndeterminate = (selectedIds?.size || 0) > 0 && !allSelected;

    const getReportActions = (report: Report): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'View Details',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => showToast(`Opening report details...`, 'info')
            }
        ];

        if (report.status !== 'resolved') {
            actions.push({
                label: 'Mark Resolved',
                variant: 'success',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                onClick: () => {
                    showToast('Resolving report...', 'info');
                    setTimeout(() => showToast('Report marked as resolved.', 'success'), 1000);
                }
            });
        }

        if (report.status !== 'dismissed') {
            actions.push({
                label: 'Dismiss',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                onClick: () => {
                    showToast('Dismissing report...', 'info');
                    setTimeout(() => showToast('Report dismissed.', 'warning'), 1000);
                }
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
                }
            });
        }

        return actions;
    };

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{ width: '40px' }}>
                            <TableCheckbox
                                checked={allSelected}
                                onChange={() => onSelectAll && onSelectAll()}
                                indeterminate={isIndeterminate}
                                disabled={!onSelectAll}
                            />
                        </th>
                        <th>Type</th>
                        <th>Report Details</th>
                        <th>Reporter</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map((report) => (
                        <tr key={report.id} className={selectedIds?.has(report.id) ? styles.rowSelected : ''}>
                            <td>
                                <TableCheckbox
                                    checked={selectedIds?.has(report.id) || false}
                                    onChange={() => onSelect && onSelect(report.id)}
                                />
                            </td>
                            <td>
                                <Badge
                                    label={formatString(report.type)}
                                    variant={getTypeVariant(report.type)}
                                />
                            </td>
                            <td>
                                <div className={styles.reportInfo}>
                                    <div className={styles.title}>{report.title}</div>
                                    <div className={styles.description}>{report.description}</div>
                                </div>
                            </td>
                            <td>
                                <div style={{ fontSize: '13px' }}>{report.reporter}</div>
                            </td>
                            <td>
                                <div style={{ fontSize: '13px', opacity: 0.8 }}>{report.date}</div>
                            </td>
                            <td>
                                <Badge
                                    label={formatString(report.status)}
                                    variant={getStatusVariant(report.status)}
                                    showDot
                                />
                            </td>
                            <td>
                                <div className={styles.actions}>
                                    <TableRowActions actions={getReportActions(report)} />
                                </div>
                            </td>
                        </tr>
                    ))}
                    {reports.length === 0 && (
                        <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '32px', opacity: 0.5 }}>
                                No reports found matching criteria.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {onPageChange && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                />
            )}
        </div>
    );
};

export default ReportTable;
