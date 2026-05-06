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
    onEditForum?: (thread: ForumThread) => void;
    onViewReports?: (thread: ForumThread) => void;
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

/**
 * Maps `forum_status` schema enum values to badge colour variants.
 * Note: casing matches the DB enum exactly (Open, Read_only, Archived).
 */
const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'open': return 'success';
        case 'read_only': return 'warning';
        case 'archived': return 'subtle';
        default: return 'neutral';
    }
};

/** Human-readable label for the forum_status enum. */
const formatForumStatus = (status: string): string => {
    switch (status) {
        case 'open': return 'Open';
        case 'read_only': return 'Read Only';
        case 'archived': return 'Archived';
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
    onEditForum,
    onViewReports,
}) => {
    const { showToast } = useToast();
    const router = useRouter();

    /** Column definitions for the forum table. */
    const columns: Column<ForumThread>[] = [
        {
            header: 'Reference',
            render: (thread) => (
                <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', opacity: 0.8 }}>
                    {thread.reference || 'N/A'}
                </span>
            ),
        },
        {
            header: 'Name',
            render: (thread) => (
                <div>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {thread.title}
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
        const actions: ActionItem[] = [
            {
                label: 'View Forum',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => window.open(`https://app.lynk-x.app/f/${thread.id}`, '_blank'),
            },
            {
                label: 'Edit Forum',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
                onClick: () => onEditForum?.(thread),
            },
            {
                label: 'View Reports',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>,
                onClick: () => onViewReports?.(thread),
                disabled: thread.reportsCount === 0,
            },
            { divider: true },
        ];

        // Status Transitions
        if (thread.status !== 'open') {
            actions.push({
                label: 'Open Forum',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>,
                onClick: () => onStatusChange?.(thread.id, 'open'),
            });
        }
        if (thread.status !== 'read_only') {
            actions.push({
                label: 'Make Read-only',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
                onClick: () => onStatusChange?.(thread.id, 'read_only'),
            });
        }
        if (thread.status !== 'archived') {
            actions.push({
                label: 'Archive Forum',
                variant: 'danger',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>,
                onClick: () => onStatusChange?.(thread.id, 'archived'),
            });
        }

        return actions;
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
