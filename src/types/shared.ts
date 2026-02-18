/**
 * Shared component types.
 *
 * Types used by reusable shared/ui components across the dashboard.
 * Components re-export these for backward compatibility.
 */

import type React from 'react';

/** Available badge colour variants. */
export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'subtle' | 'primary' | 'neutral';

/** A bulk-action button rendered when rows are selected. */
export interface BulkAction {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'success';
    icon?: React.ReactNode;
}

/**
 * A single action inside a table row's action menu.
 * Use `{ divider: true }` for a visual separator.
 */
export type ActionItem =
    | { divider: true }
    | {
        label: string;
        icon?: React.ReactNode;
        onClick: () => void;
        variant?: 'default' | 'danger' | 'success';
        disabled?: boolean;
        divider?: never;
    };

/** Toast notification type. */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/** A column definition for `DataTable`. */
export interface Column<T> {
    /** Text shown in the `<th>` header cell. */
    header: string;
    /** Renders the cell content for a given row. */
    render: (item: T) => React.ReactNode;
    /** Optional inline styles applied to the `<th>` element. */
    headerStyle?: React.CSSProperties;
}

/** Props for the generic `DataTable` component. */
export interface DataTableProps<T extends { id: string | number }> {
    /** Array of data rows to display. */
    data: T[];
    /** Column definitions — order determines render order. */
    columns: Column<T>[];
    /** Per-row action menu items (rendered via `TableRowActions`). */
    getActions?: (item: T) => ActionItem[];
    /** Currently-selected row IDs (controlled externally). */
    selectedIds?: Set<string>;
    /** Called when a single row's checkbox is toggled. */
    onSelect?: (id: string) => void;
    /** Called when the "select all" header checkbox is toggled. */
    onSelectAll?: () => void;
    /** Current page number (1-indexed). */
    currentPage?: number;
    /** Total number of pages. */
    totalPages?: number;
    /** Called when the user navigates to a different page. */
    onPageChange?: (page: number) => void;
    /** Message shown when `data` is empty. */
    emptyMessage?: string;
    /** Optional additional CSS class on the outermost container. */
    className?: string;
}
