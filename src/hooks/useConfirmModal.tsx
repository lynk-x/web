"use client";

import React, { useState, useCallback, useRef } from 'react';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

export interface ConfirmOptions {
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
}

/**
 * Promise-based confirmation modal. Replaces window.confirm() across the dashboard.
 *
 * Usage:
 *   const { confirm, ConfirmDialog } = useConfirmModal();
 *
 *   // In JSX return:
 *   return <>{ConfirmDialog}<div>...</div></>;
 *
 *   // In async handler:
 *   if (!await confirm('Delete this item?', { title: 'Delete', confirmLabel: 'Delete' })) return;
 */
export function useConfirmModal() {
    const [state, setState] = useState<{ message: string; options: ConfirmOptions } | null>(null);
    const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

    const confirm = useCallback((message: string, options?: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setState({ message, options: options ?? {} });
            resolveRef.current = resolve;
        });
    }, []);

    const handleConfirm = useCallback(() => {
        setState(null);
        resolveRef.current?.(true);
    }, []);

    const handleClose = useCallback(() => {
        setState(null);
        resolveRef.current?.(false);
    }, []);

    const ConfirmDialog = state ? (
        <ConfirmationModal
            isOpen
            onClose={handleClose}
            onConfirm={handleConfirm}
            title={state.options.title ?? 'Are you sure?'}
            message={state.message}
            confirmLabel={state.options.confirmLabel}
            cancelLabel={state.options.cancelLabel}
            variant={state.options.variant ?? 'danger'}
        />
    ) : null;

    return { confirm, ConfirmDialog };
}
