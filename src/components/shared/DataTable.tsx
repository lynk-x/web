"use client";

import React from 'react';
import styles from './DataTable.module.css';
import TableCheckbox from './TableCheckbox';
import TableRowActions from './TableRowActions';
import Pagination from './Pagination';
import Spinner from './Spinner';
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
 * Below 640 px every row turns into a stacked card: the first column is the card title, the other columns
 * show as label and value pairs, and the actions menu sits in the top-right corner.
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

    // The title column on phones: the one marked primary, otherwise the first.
    const titleIndex = Math.max(0, columns.findIndex((col) => col.primary));

    // Total columns = checkbox + user columns + optional actions column
    const totalColumns = columns.length + (onSelect ? 1 : 0) + (getActions ? 1 : 0);

    return (
        <div className={`${styles.tableContainer} ${className}`}>
            <table className={`${styles.table} table-sticky-header`}>
                <thead>
                    <tr>
                        {/* Select-all checkbox */}
                        {onSelect && (
                            <th className={styles.selectCell} style={{ width: '40px' }}>
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
                                <td className={styles.selectCell}>
                                    <TableCheckbox
                                        checked={selectedIds?.has(String(item.id)) || false}
                                        onChange={() => onSelect(String(item.id))}
                                    />
                                </td>
                            )}

                            {/* Data cells */}
                            {/* data-label and data-first drive the stacked card layout on phones (see the CSS). */}
                            {columns.map((col, idx) => (
                                <td
                                    key={idx}
                                    style={col.cellStyle}
                                    data-label={col.header}
                                    data-first={idx === titleIndex ? '' : undefined}
                                >
                                    {col.render(item, rowIndex)}
                                </td>
                            ))}

                            {/* Row actions */}
                            {getActions && (
                                <td className={styles.actionsCell} style={{ paddingLeft: '0', textAlign: 'right', width: '80px' }}>
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
                                <Spinner size={16} label="Loading data..." />
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
