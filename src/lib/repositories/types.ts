/**
 * Shared types for all repository modules.
 *
 * Repositories accept a SupabaseClient and return RepoResult<T> — a discriminated
 * union that forces callers to handle both success and error paths explicitly,
 * replacing the scattered `if (error) throw error` pattern in components.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** The client type accepted by every repository factory. Works with both
 *  createClient() (browser) and createClient() (server) from @/utils/supabase. */
export type DbClient = SupabaseClient;

/** Discriminated union result — callers narrow on `error !== null`. */
export type RepoResult<T> =
    | { data: T; error: null }
    | { data: null; error: Error };

/** Wrap a Supabase PostgREST error into a plain Error. */
export function toError(err: { message: string } | null | undefined): Error {
    return new Error(err?.message ?? 'Unknown repository error');
}

/** Standard list query options shared across repositories. */
export interface ListOptions {
    /** 1-based page number */
    page?: number;
    /** Rows per page (default 20) */
    pageSize?: number;
}
