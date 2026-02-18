"use client";

import React from 'react';
import styles from './ContentTable.module.css';
import TableCheckbox from '../shared/TableCheckbox';
import Badge, { BadgeVariant } from '../shared/Badge';
import TableRowActions, { ActionItem } from '../shared/TableRowActions';
import Pagination from '../shared/Pagination';
import { useToast } from '@/components/ui/Toast';

export interface ContentItem {
    id: string;
    title: string;
    slug: string;
    type: 'page' | 'post' | 'announcement';
    author: string;
    lastUpdated: string;
    status: 'published' | 'draft' | 'archived';
}

interface ContentTableProps {
    items: ContentItem[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const ContentTable: React.FC<ContentTableProps> = ({
    items,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange
}) => {
    const { showToast } = useToast();
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
            case 'announcement': return 'warning'; // Or another color if available, warning is okay for announcement
            default: return 'neutral';
        }
    };

    const formatString = (str: string) => {
        return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const allSelected = items.length > 0 && selectedIds?.size === items.length;
    const isIndeterminate = (selectedIds?.size || 0) > 0 && !allSelected;

    const getContentActions = (item: ContentItem): ActionItem[] => {
        return [
            {
                label: 'Edit',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
                onClick: () => showToast(`Opening editor for ${item.title}...`, 'info')
            },
            {
                label: 'Delete',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
                variant: 'danger',
                onClick: () => {
                    showToast(`Deleting ${item.title}...`, 'info');
                    setTimeout(() => showToast('Content deleted.', 'success'), 1500);
                }
            }
        ];
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
                        <th>Content</th>
                        <th>Type</th>
                        <th>Author</th>
                        <th>Last Updated</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr key={item.id} className={selectedIds?.has(item.id) ? styles.rowSelected : ''}>
                            <td>
                                <TableCheckbox
                                    checked={selectedIds?.has(item.id) || false}
                                    onChange={() => onSelect && onSelect(item.id)}
                                />
                            </td>
                            <td>
                                <div className={styles.contentInfo}>
                                    <div className={styles.title}>{item.title}</div>
                                    <div className={styles.slug}>{item.slug}</div>
                                </div>
                            </td>
                            <td>
                                <Badge
                                    label={formatString(item.type)}
                                    variant={getTypeVariant(item.type)}
                                />
                            </td>
                            <td>
                                <div style={{ fontSize: '13px' }}>{item.author}</div>
                            </td>
                            <td>
                                <div style={{ fontSize: '13px', opacity: 0.8 }}>{item.lastUpdated}</div>
                            </td>
                            <td>
                                <Badge
                                    label={formatString(item.status)}
                                    variant={getStatusVariant(item.status)}
                                    showDot
                                />
                            </td>
                            <td>
                                <div className={styles.actions}>
                                    <TableRowActions actions={getContentActions(item)} />
                                </div>
                            </td>
                        </tr>
                    ))}
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '32px', opacity: 0.5 }}>
                                No content found matching criteria.
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

export default ContentTable;
