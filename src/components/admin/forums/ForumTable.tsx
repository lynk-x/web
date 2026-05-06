"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString, formatRelativeTime } from '@/utils/format';
import type { ActionItem } from '../../shared/TableRowActions';
import { exportToCSV } from '@/utils/export';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { ForumThread } from '@/types/admin';
import type { ForumThread } from '@/types/admin';

interface ForumTableProps {
    threads: ForumThread[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    onStatusChange?: (id: string, status: string) => void;
    onBrowseMessages?: (thread: ForumThread) => void;
    onBrowseMedia?: (thread: ForumThread) => void;
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

/**
 * Maps `forum_status` schema enum values to badge colour variants.
 * Note: casing matches the DB enum exactly (Open, Read_only, Archived).
 */
const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'Open': return 'success';
        case 'Read_only': return 'warning';
        case 'Archived': return 'subtle';
        default: return 'neutral';
    }
};

/** Human-readable label for the forum_status enum. */
const formatForumStatus = (status: string): string => {
    switch (status) {
        case 'Open': return 'Open';
        case 'Read_only': return 'Read Only';
        case 'Archived': return 'Archived';
        default: return status;
    }
};


// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Admin forum thread management table.
 * Displays thread details, categories, statuses, and provides moderation actions.
 */
const ForumTable: React.FC<ForumTableProps> = ({
    threads,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    onStatusChange,
    onBrowseMessages,
    onBrowseMedia,
}) => {
    const { showToast } = useToast();
    const router = useRouter();

    /** Column definitions for the forum table. */
    const columns: Column<ForumThread>[] = [
        {
            header: 'Name',
            render: (thread) => (
                <div>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {thread.title}
                        {thread.reference && (
                            <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', opacity: 0.5, fontWeight: 400 }}>
                                {thread.reference}
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>
                        for <span style={{ color: 'var(--color-brand-primary)' }}>{thread.eventName}</span>
                    </div>
                </div>
            ),
        },
        {
            header: 'Messages',
            render: (thread) => <div style={{ fontSize: '13px' }}>{thread.messageCount}</div>,
        },
        {
            header: 'Monitor / Reports',
            render: (thread) => {
                if (thread.reportsCount === 0) return <span style={{ opacity: 0.4 }}>Health Good (0)</span>;

                // Calculate age of oldest report
                const oldestDate = thread.oldestReportAt ? new Date(thread.oldestReportAt) : null;
                const hoursOld = oldestDate ? (new Date().getTime() - oldestDate.getTime()) / (1000 * 60 * 60) : 0;

                // Determine urgency color
                let urgencyColor = 'var(--color-status-success)'; // Not really used for >0
                if (hoursOld > 24 || thread.escalatedCount > 0) urgencyColor = '#FF4444'; // Red for >24h or Escalated
                else if (hoursOld > 12) urgencyColor = '#FFA500'; // Orange for >12h
                else urgencyColor = '#FFD700'; // Yellow for recent

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Badge
                                label={`${thread.reportsCount} Pending`}
                                variant={thread.escalatedCount > 0 ? 'error' : 'warning'}
                                showDot
                            />
                            {thread.escalatedCount > 0 && (
                                <span style={{ fontSize: '9px', fontWeight: 800, color: '#FF4444', letterSpacing: '0.5px' }}>ESCALATED</span>
                            )}
                        </div>
                        <div style={{ fontSize: '11px', color: urgencyColor, fontWeight: 500 }}>
                            Oldest: {formatRelativeTime(thread.oldestReportAt || '')}
                        </div>
                    </div>
                );
            },
        },
        {
            header: 'Status',
            render: (thread) => (
                // forum_status enum: Open | Read_only | Archived
                <Badge label={formatForumStatus(thread.status)} variant={getStatusVariant(thread.status)} showDot />
            ),
        },
        {
            header: 'Last Activity',
            render: (thread) => (
                <div style={{ fontSize: '13px', opacity: 0.8 }}>{thread.lastActivity}</div>
            ),
        },
    ];

    /** Row-level moderation actions for each forum. */
    const getActions = (thread: ForumThread): ActionItem[] => {
        return [
            {
                label: 'Browse Messages',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
                onClick: () => onBrowseMessages?.(thread),
            },
            {
                label: 'View Media Gallery',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
                onClick: () => onBrowseMedia?.(thread),
            },
            { divider: true },
            {
                label: 'Call Moderator',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
                onClick: () => showToast(`Paging moderator for ${thread.title}`, 'info'),
            },
            {
                label: 'Set Read-only',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
                onClick: () => {
                    if (onStatusChange) onStatusChange(thread.id, 'Read_only');
                    else showToast(`${thread.title} is now read-only.`, 'warning');
                },
            },
            {
                label: 'Archive Forum',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>,
                onClick: () => {
                    if (onStatusChange) onStatusChange(thread.id, 'Archived');
                    else showToast(`${thread.title} archived.`, 'info');
                },
            },
            {
                label: 'View Logs',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>,
                onClick: () => {
                    showToast(`Opening logs for ${thread.title}...`, 'info');
                    router.push(`/dashboard/admin/audit-logs?search=${encodeURIComponent(thread.title)}`);
                },
            },
            {
                label: 'Export as CSV',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
                onClick: () => {
                    showToast(`Exporting data for ${thread.title}`, 'info');
                    exportToCSV([thread], `forum_export_${thread.id}`);
                    showToast('Export successful.', 'success');
                },
            },
        ];
    };

    return (
        <DataTable<ForumThread>
            data={threads}
            columns={columns}
            getActions={getActions}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="No threads found matching criteria."
        />
    );
};

export default ForumTable;
