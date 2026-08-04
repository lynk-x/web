"use client";

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/error';
import type { RepoError, RepoResult } from '@/lib/repositories/types';

export interface OptimisticMutationOptions<TData, TVariables, TSnapshot> {
    /** Repository call — must return RepoResult, same contract as useRepoMutation. */
    mutationFn: (variables: TVariables) => Promise<RepoResult<TData>>;
    /**
     * Applies the optimistic change to local state and returns a snapshot of
     * what the state looked like *before* the change, for rollback. Called
     * synchronously, before the network request fires.
     */
    applyOptimistic: (variables: TVariables) => TSnapshot;
    /** Restores local state from the snapshot captured by `applyOptimistic`. */
    rollback: (snapshot: TSnapshot, variables: TVariables) => void;
    errorMessage?: string;
    successMessage?: string | ((data: TData, variables: TVariables) => string);
    /** Same idempotency contract as useRepoMutation — default 1, pass `false` for non-idempotent actions. */
    retry?: UseMutationOptions<TData, RepoError, TVariables, TSnapshot>['retry'];
    onSuccess?: (data: TData, variables: TVariables) => void;
}

/**
 * Convention for optimistic local-state updates with automatic rollback on
 * failure, built on the same RepoResult contract as useRepoMutation.
 *
 * Not currently wired into any screen — this establishes the pattern
 * (onMutate snapshot + apply, onError rollback, onSettled reconcile) for the
 * first real adoption rather than each call site inventing its own. The
 * clearest first candidates are UI-only toggles already doing manual
 * optimistic state without rollback today, e.g. the notifications list
 * (see NotificationsPage, which currently uses useRepoMutation without
 * onMutate — this hook is the next step once optimistic apply/rollback
 * is worth centralizing there rather than doing it inline).
 *
 * Usage sketch:
 *
 *   const toggleRead = useOptimisticMutation({
 *     mutationFn: (n: Notification) => notificationsRepo.markRead(n.id, n.created_at),
 *     applyOptimistic: (n) => {
 *       const prev = notifications; // snapshot before mutating
 *       setNotifications(list => list.map(x => x.id === n.id ? { ...x, is_read: true } : x));
 *       return prev;
 *     },
 *     rollback: (prev) => setNotifications(prev),
 *     errorMessage: 'Could not mark notification as read',
 *   });
 *
 *   toggleRead.mutate(notification);
 */
export function useOptimisticMutation<TData, TVariables, TSnapshot>(
    options: OptimisticMutationOptions<TData, TVariables, TSnapshot>
) {
    const { showToast } = useToast();
    const { mutationFn, applyOptimistic, rollback, errorMessage, successMessage, retry = 1, onSuccess } = options;

    return useMutation<TData, RepoError, TVariables, TSnapshot>({
        mutationFn: async (variables: TVariables) => {
            const { data, error } = await mutationFn(variables);
            if (error) throw error;
            return data;
        },
        retry,
        onMutate: (variables) => applyOptimistic(variables),
        onError: (err, variables, snapshot) => {
            console.error('Optimistic mutation failed, rolling back:', err);
            if (snapshot !== undefined) rollback(snapshot, variables);
            showToast(getErrorMessage(err) || errorMessage || 'Something went wrong', 'error');
        },
        onSuccess: (data, variables) => {
            if (successMessage) {
                showToast(typeof successMessage === 'function' ? successMessage(data, variables) : successMessage, 'success');
            }
            onSuccess?.(data, variables);
        },
    });
}
