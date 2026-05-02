/**
 * Shared types for all repository modules.
 *
 * Repositories return `RepoResult<T>` — a discriminated union that forces callers
 * to handle both success and error paths. Errors preserve the underlying
 * PostgrestError fields (`code`, `details`, `hint`) so the UI can distinguish
 * between e.g. RLS denials (42501), unique-violation (23505), and not-found
 * (PGRST116) without re-parsing strings.
 */

import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

/** The client type accepted by every repository factory. */
export type DbClient = SupabaseClient;

/**
 * Error envelope. `code` follows PostgreSQL/PostgREST conventions:
 *   - 5-char SQLSTATE codes (e.g. '23505', '42501')
 *   - PGRST*-prefixed PostgREST codes (e.g. 'PGRST116' = no rows for .single())
 *   - 'CLIENT_*' codes used by repos for typed client-side conditions
 */
export interface RepoError {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
}

/** Discriminated union result — callers narrow on `error !== null`. */
export type RepoResult<T> =
    | { data: T; error: null }
    | { data: null; error: RepoError };

/** Result shape for paginated list queries with an optional total row count. */
export type RepoListResult<T> =
    | { data: T[]; total: number | null; error: null }
    | { data: null; total: null; error: RepoError };

/** Wrap a PostgrestError (or any error-like value) into a RepoError. */
export function toError(err: PostgrestError | { message: string } | null | undefined): RepoError {
    if (err && typeof err === 'object' && 'code' in err) {
        const e = err as PostgrestError;
        return { message: e.message ?? 'Unknown error', code: e.code, details: e.details, hint: e.hint };
    }
    return { message: err?.message ?? 'Unknown repository error' };
}

/** True when the error is a PostgREST "no rows" sentinel from `.single()`. */
export function isNotFound(err: RepoError): boolean {
    return err.code === 'PGRST116';
}

/** True when the error is a PostgreSQL "insufficient privilege" — typically RLS. */
export function isPermissionDenied(err: RepoError): boolean {
    return err.code === '42501';
}

/** True when the error is a unique-key violation. */
export function isUniqueViolation(err: RepoError): boolean {
    return err.code === '23505';
}

/** Standard list query options shared across repositories. */
export interface ListOptions {
    /** 1-based page number */
    page?: number;
    /** Rows per page (default 20) */
    pageSize?: number;
    /** When true, the query also returns the total count (extra DB cost — opt-in). */
    withCount?: boolean;
}
