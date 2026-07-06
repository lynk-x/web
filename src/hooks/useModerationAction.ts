"use client";

import { useCallback } from 'react';
import { useAction } from '@/hooks/useAction';

interface ModerationActionOptions {
    onSuccess?: () => void;
    successMessage?: string;
    loadingMessage?: string;
}

/**
 * Moderation-flavoured wrapper over useAction (kept for existing callers —
 * prefer useAction directly in new code). Defaults a loading toast and
 * generic success/error copy suited to approve/reject/resolve actions.
 */
export function useModerationAction() {
    const { run, isProcessing } = useAction();

    const executeAction = useCallback((
        actionFn: () => Promise<{ error: any }> | PromiseLike<{ error: any }>,
        options: ModerationActionOptions = {}
    ) => run(actionFn, {
        loadingMessage: options.loadingMessage ?? 'Processing action...',
        successMessage: options.successMessage ?? 'Action completed successfully',
        errorMessage: 'Failed to complete action',
        onSuccess: options.onSuccess,
    }), [run]);

    return {
        executeAction,
        isProcessing
    };
}
