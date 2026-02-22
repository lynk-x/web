"use client";

import React from 'react';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString } from '@/utils/format';
import type { ActionItem } from '../../shared/TableRowActions';

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

const getCategoryVariant = (category: string): BadgeVariant => {
    switch (category) {
        case 'announcements': return 'info';
        case 'support': return 'warning';
        case 'feedback': return 'success';
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

    /** Column definitions for the forum table. */
    const columns: Column<ForumThread>[] = [
        {
            header: 'Thread',
            render: (thread) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{thread.title}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>
                        by <span style={{ color: 'var(--color-brand-primary)' }}>{thread.author}</span>
                    </div>
                </div>
            ),
        },
        {
            header: 'Category',
            render: (thread) => (
                <Badge label={formatString(thread.category)} variant={getCategoryVariant(thread.category)} />
            ),
        },
        {
            header: 'Status',
            render: (thread) => (
                <Badge label={formatString(thread.status)} variant={getStatusVariant(thread.status)} showDot />
            ),
        },
        {
            header: 'Stats',
            render: (thread) => (
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                    <div>{thread.replies} replies</div>
                    <div style={{ opacity: 0.6 }}>{thread.views} views</div>
                </div>
            ),
        },
        {
            header: 'Last Activity',
            render: (thread) => (
                <div style={{ fontSize: '13px', opacity: 0.8 }}>{thread.lastActivity}</div>
            ),
        },
    ];

    /** Row-level moderation actions for each thread. */
    const getActions = (thread: ForumThread): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'View Thread',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => showToast(`Opening thread: ${thread.title}...`, 'info'),
            },
        ];

        if (thread.status !== 'locked') {
            actions.push({
                label: 'Lock Thread',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
                onClick: () => {
                    showToast('Locking thread...', 'info');
                    setTimeout(() => showToast('Thread locked.', 'info'), 1000);
                },
            });
        } else {
            actions.push({
                label: 'Unlock',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>,
                onClick: () => {
                    showToast('Unlocking thread...', 'info');
                    setTimeout(() => showToast('Thread unlocked.', 'success'), 1000);
                },
            });
        }

        if (thread.status !== 'hidden') {
            actions.push({
                label: 'Hide Thread',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>,
                onClick: () => {
                    showToast('Hiding thread...', 'info');
                    setTimeout(() => showToast('Thread hidden.', 'warning'), 1000);
                },
            });
        }

        actions.push({
            label: 'Delete',
            variant: 'danger',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
            onClick: () => {
                showToast(`Deleting thread: ${thread.title}...`, 'info');
                setTimeout(() => showToast('Thread deleted.', 'success'), 1500);
            },
        });

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
