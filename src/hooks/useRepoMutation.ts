"use client";

import { useMutation, type MutationFunction } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/error';
import type { RepoError, RepoResult } from '@/lib/repositories/types';

export interface RepoMutationOptions<TData, TVariables> {
    /** Toast on success. Omit for silent success. Can derive from the result. */
    successMessage?: string | ((data: TData, variables: TVariables) => string);
    /** Fallback toast when the failure has no usable message of its own. */
    errorMessage?: string;
    /**
     * Number of retry attempts for transient failures. Defaults to 1, matching
     * the query-level default in QueryProvider (mutations don't inherit that
     * default automatically). Only raise this, or leave it, for operations
     * confirmed idempotent — pass `retry: false` for anything non-idempotent
     * (payments, deltas, one-shot creates/deletes).
     */
    retry?: boolean | number;
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (err: RepoError, variables: TVariables) => void;
}

/**
 * Wraps `useMutation` around a repository call that returns `RepoResult<T>`
 * instead of throwing — unwraps the discriminated union into TanStack Query's
 * throw-on-error model so retry/error state work, and toasts failures the
 * same way `useAction` does today.
 *
 * Only use this for mutations confirmed safe to retry (idempotent, or backed
 * by a server-side uniqueness/set-to-value guarantee). Non-idempotent actions
 * (payouts, balance deltas, one-shot creates) should pass `retry: false`.
 */
export function useRepoMutation<TData, TVariables = void>(
    mutationFn: (variables: TVariables) => Promise<RepoResult<TData>>,
    options: RepoMutationOptions<TData, TVariables> = {}
) {
    const { showToast } = useToast();
    const { successMessage, errorMessage, retry = 1, onError, onSuccess } = options;

    const wrappedMutationFn: MutationFunction<TData, TVariables> = async (variables) => {
        const { data, error } = await mutationFn(variables);
        if (error) throw error;
        return data;
    };

    return useMutation<TData, RepoError, TVariables>({
        mutationFn: wrappedMutationFn,
        retry,
        onSuccess: (data, variables) => {
            if (successMessage) {
                showToast(typeof successMessage === 'function' ? successMessage(data, variables) : successMessage, 'success');
            }
            onSuccess?.(data, variables);
        },
        onError: (err, variables) => {
            console.error('Mutation failed:', err);
            showToast(getErrorMessage(err) || errorMessage || 'Something went wrong', 'error');
            onError?.(err, variables);
        },
    });
}
