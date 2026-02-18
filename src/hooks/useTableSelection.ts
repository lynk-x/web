/**
 * Custom hook for table row selection state.
 *
 * Encapsulates the `allSelected` / `isIndeterminate` computation that
 * was previously copy-pasted into every table component. Consumers
 * pass in the data array and the current set of selected IDs; the hook
 * returns derived booleans for the "select all" checkbox.
 */

import { useMemo } from 'react';

interface HasId {
    id: string | number;
}

interface TableSelectionState {
    /** True when every item in the dataset is selected. */
    allSelected: boolean;
    /** True when some (but not all) items are selected. */
    isIndeterminate: boolean;
}

/**
 * Derives selection-state flags from the data array and selected IDs.
 *
 * @param items       - The full array of data rows (must have `id` field).
 * @param selectedIds - An optional Set of currently-selected IDs.
 * @returns `{ allSelected, isIndeterminate }` for checkbox rendering.
 *
 * @example
 * const { allSelected, isIndeterminate } = useTableSelection(users, selectedIds);
 */
export function useTableSelection<T extends HasId>(
    items: T[],
    selectedIds?: Set<string>,
): TableSelectionState {
    return useMemo(() => {
        const count = selectedIds?.size ?? 0;
        const total = items.length;
        const allSelected = total > 0 && count === total;
        const isIndeterminate = count > 0 && !allSelected;
        return { allSelected, isIndeterminate };
    }, [items, selectedIds]);
}
