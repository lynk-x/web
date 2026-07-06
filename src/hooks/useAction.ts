"use client";

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/error';

/**
 * Result shape produced by Supabase queries/RPCs and repository methods.
 * A thrown error is treated the same as a returned `error`.
 */
type ActionResult<T> = { data?: T | null; error?: unknown } | void;

export interface ActionOptions<T = unknown> {
    /** Toast on success. Omit for silent success. Can derive from the result. */
    successMessage?: string | ((data: T | null | undefined) => string);
    /** Fallback toast when the failure has no usable message of its own. */
    errorMessage?: string;
    /** Optional info toast shown before the action runs. */
    loadingMessage?: string;
    onSuccess?: (data: T | null | undefined) => void | Promise<void>;
    onError?: (err: unknown) => void;
    /** Runs after success or failure — for page-level loading flags etc. */
    onSettled?: () => void;
}

/**
 * Single place for the run-action → toast → refresh plumbing that admin and
 * dashboard pages repeat: executes a Supabase call (or any `{ data, error }`
 * returner), toasts failure via getErrorMessage, toasts success, invokes
 * follow-ups, and tracks a processing flag for disabling buttons.
 *
 * Returns the action's `data` on success, `undefined` on failure — callers
 * that need the result can await it without their own try/catch.
 */
export function useAction() {
    const { showToast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    const run = useCallback(async <T,>(
        actionFn: () => Promise<ActionResult<T>> | PromiseLike<ActionResult<T>>,
        options: ActionOptions<T> = {}
    ): Promise<T | null | undefined> => {
        const { successMessage, errorMessage, loadingMessage, onSuccess, onError, onSettled } = options;

        setIsProcessing(true);
        if (loadingMessage) showToast(loadingMessage, 'info');

        try {
            const result = await actionFn();
            const error = result && typeof result === 'object' && 'error' in result ? result.error : undefined;
            if (error) throw error;
            const data = result && typeof result === 'object' && 'data' in result ? result.data : undefined;

            if (successMessage) {
                showToast(typeof successMessage === 'function' ? successMessage(data) : successMessage, 'success');
            }
            await onSuccess?.(data);
            return data;
        } catch (err) {
            console.error('Action failed:', err);
            showToast(getErrorMessage(err) || errorMessage || 'Something went wrong', 'error');
            onError?.(err);
            return undefined;
        } finally {
            setIsProcessing(false);
            onSettled?.();
        }
    }, [showToast]);

    return { run, isProcessing };
}
