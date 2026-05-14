"use client";

import React from 'react';
import styles from './DataTable.module.css';
import TableCheckbox from './TableCheckbox';
import TableRowActions from './TableRowActions';
import Pagination from './Pagination';
import { useTableSelection } from '@/hooks/useTableSelection';
import type { ActionItem } from '@/types/shared';

// ─── Public Types ────────────────────────────────────────────────────────────

export type { Column, DataTableProps } from '@/types/shared';
import type { Column, DataTableProps } from '@/types/shared';

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Generic, column-driven data table with built-in selection,
 * pagination, row actions, and empty-state handling.
 *
 * Domain tables (e.g. UserTable, ForumTable) become thin wrappers
 * that provide `columns` and `getActions` — all structural
 * boilerplate lives here.
 *
 * @example
 * ```tsx
 * <DataTable
 *   data={users}
 *   columns={[
 *     { header: 'Name', render: (u) => u.name },
 *     { header: 'Email', render: (u) => u.email },
 *   ]}
 *   getActions={(u) => [
 *     { label: 'Edit', onClick: () => edit(u) },
 *   ]}
 *   emptyMessage="No users found."
 * />
 * ```
 */
function DataTable<T extends { id: string | number }>({
    data,
    columns,
    getActions,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    emptyMessage = 'No data found.',
    isLoading = false,
    className = '',
}: DataTableProps<T>) {
    const { allSelected, isIndeterminate } = useTableSelection(data, selectedIds);

    // Total columns = checkbox + user columns + optional actions column
    const totalColumns = columns.length + (onSelect ? 1 : 0) + (getActions ? 1 : 0);

    return (
        <div className={`${styles.tableContainer} ${className}`}>
            <table className={`${styles.table} table-sticky-header`}>
                <thead>
                    <tr>
                        {/* Select-all checkbox */}
                        {onSelect && (
                            <th style={{ width: '40px' }}>
                                <TableCheckbox
                                    checked={allSelected}
                                    onChange={() => onSelectAll?.()}
                                    indeterminate={isIndeterminate}
                                    disabled={!onSelectAll}
                                />
                            </th>
                        )}

                        {/* Column headers */}
                        {columns.map((col, idx) => (
                            <th key={idx} style={{ ...col.headerStyle, width: col.width }}>
                                {col.header}
                            </th>
                        ))}

                        {/* Actions header */}
                        {getActions && (
                            <th style={{ textAlign: 'right', paddingLeft: '0', width: '80px' }}>Actions</th>
                        )}
                    </tr>
                </thead>

                <tbody>
                    {data.map((item, rowIndex) => (
                        <tr
                            key={String(item.id)}
                            className={selectedIds?.has(String(item.id)) ? styles.rowSelected : ''}
                        >
                            {/* Row checkbox */}
                            {onSelect && (
                                <td>
                                    <TableCheckbox
                                        checked={selectedIds?.has(String(item.id)) || false}
                                        onChange={() => onSelect(String(item.id))}
                                    />
                                </td>
                            )}

                            {/* Data cells */}
                            {columns.map((col, idx) => (
                                <td key={idx} style={col.cellStyle}>{col.render(item, rowIndex)}</td>
                            ))}

                            {/* Row actions */}
                            {getActions && (
                                <td style={{ paddingLeft: '0', textAlign: 'right', width: '80px' }}>
                                    <div className={styles.actions}>
                                        <TableRowActions actions={getActions(item)} />
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}

                    {/* Loading State */}
                    {isLoading && (
                        <tr>
                            <td colSpan={totalColumns} className={styles.emptyState} style={{ opacity: 0.5 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                    Loading data...
                                </div>
                            </td>
                        </tr>
                    )}

                    {/* Empty state */}
                    {!isLoading && data.length === 0 && (
                        <tr>
                            <td colSpan={totalColumns} className={styles.emptyState}>
                                {emptyMessage}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Pagination */}
            {onPageChange && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                />
            )}
        </div>
    );
}

export default DataTable;
