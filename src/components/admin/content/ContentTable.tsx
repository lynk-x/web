"use client";

import React from 'react';
import styles from './ContentTable.module.css';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString } from '@/utils/format';
import type { ActionItem } from '../../shared/TableRowActions';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { ContentItem } from '@/types/admin';
import type { ContentItem } from '@/types/admin';

interface ContentTableProps {
    items: ContentItem[];
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
        case 'published': return 'success';
        case 'draft': return 'warning';
        case 'archived': return 'neutral';
        default: return 'neutral';
    }
};

const getTypeVariant = (type: string): BadgeVariant => {
    switch (type) {
        case 'page': return 'neutral';
        case 'post': return 'info';
        case 'announcement': return 'warning';
        default: return 'neutral';
    }
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Admin content management table.
 * Displays page/post/announcement content with editing actions.
 */
const ContentTable: React.FC<ContentTableProps> = ({
    items,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const { showToast } = useToast();
    const router = useRouter();

    /** Column definitions for the content table. */
    const columns: Column<ContentItem>[] = [
        {
            header: 'Content',
            render: (item) => (
                <div className={styles.contentInfo}>
                    <div className={styles.title}>{item.title}</div>
                    <div className={styles.slug}>{item.slug}</div>
                </div>
            ),
        },
        {
            header: 'Type',
            render: (item) => <Badge label={formatString(item.type)} variant={getTypeVariant(item.type)} />,
        },
        {
            header: 'Author',
            render: (item) => <div style={{ fontSize: '13px' }}>{item.author}</div>,
        },
        {
            header: 'Last Updated',
            render: (item) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{item.lastUpdated}</div>,
        },
        {
            header: 'Status',
            render: (item) => (
                <Badge label={formatString(item.status)} variant={getStatusVariant(item.status)} showDot />
            ),
        },
    ];

    /** Row-level actions for content items. */
    const getActions = (item: ContentItem): ActionItem[] => [
        {
            label: 'Edit',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => router.push(`/dashboard/admin/content/edit/${item.id}`),
        },
        {
            label: 'Delete',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            variant: 'danger',
            onClick: () => {
                showToast(`Deleting ${item.title}...`, 'info');
                setTimeout(() => showToast('Content deleted.', 'success'), 1500);
            },
        },
    ];

    return (
        <DataTable<ContentItem>
            data={items}
            columns={columns}
            getActions={getActions}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="No content found matching criteria."
        />
    );
};

export default ContentTable;
