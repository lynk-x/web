"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString } from '@/utils/format';
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
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'active': return 'success';
        case 'locked': return 'neutral';
        case 'flagged': return 'warning';
        case 'hidden': return 'error';
        default: return 'neutral';
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
}) => {
    const { showToast } = useToast();
    const router = useRouter();

    /** Column definitions for the forum table. */
    const columns: Column<ForumThread>[] = [
        {
            header: 'Name',
            render: (thread) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{thread.title}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>
                        for <span style={{ color: 'var(--color-brand-primary)' }}>{thread.eventName}</span>
                    </div>
                </div>
            ),
        },
        {
            header: 'Announcements',
            render: (thread) => <div style={{ fontSize: '13px' }}>{thread.announcementsCount}</div>,
        },
        {
            header: 'Live Chats',
            render: (thread) => <div style={{ fontSize: '13px' }}>{thread.liveChatsCount}</div>,
        },
        {
            header: 'Media',
            render: (thread) => <div style={{ fontSize: '13px' }}>{thread.mediaCount}</div>,
        },
        {
            header: 'Status',
            render: (thread) => (
                <Badge label={formatString(thread.status)} variant={getStatusVariant(thread.status)} showDot />
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
                label: 'Call Moderator',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
                onClick: () => showToast(`Paging moderator for ${thread.title}`, 'info'),
            },
            {
                label: 'Set Read-only',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
                onClick: () => showToast(`${thread.title} is now read-only.`, 'warning'),
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
