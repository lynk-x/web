"use client";

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/error';

interface ModerationActionOptions {
    onSuccess?: () => void;
    successMessage?: string;
    loadingMessage?: string;
}

/**
 * A hook for handling standardized moderation actions via Supabase RPCs.
 * Manages loading states, toast notifications, and error handling.
 */
export function useModerationAction() {
    const { showToast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    const executeAction = useCallback(async (
        actionFn: () => Promise<{ error: any }> | PromiseLike<{ error: any }>,
        options: ModerationActionOptions = {}
    ) => {
        const {
            onSuccess,
            successMessage = 'Action completed successfully',
            loadingMessage = 'Processing action...'
        } = options;

        setIsProcessing(true);
        if (loadingMessage) showToast(loadingMessage, 'info');

        try {
            const { error } = await actionFn();
            
            if (error) {
                throw error;
            }

            showToast(successMessage, 'success');
            onSuccess?.();
        } catch (err) {
            console.error('Moderation action failed:', err);
            showToast(getErrorMessage(err) || 'Failed to complete action', 'error');
        } finally {
            setIsProcessing(false);
        }
    }, [showToast]);

    return {
        executeAction,
        isProcessing
    };
}
