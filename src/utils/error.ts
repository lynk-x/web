/**
 * Maps raw errors (Supabase Auth errors, PostgREST/RepoError, network
 * failures, plain JS errors) into short, human-readable strings for display
 * in toasts and inline form errors.
 *
 * `getErrorMessage` is the single choke point nearly every mutation path in
 * the app already calls (useAction/useRepoMutation/useOptimisticMutation,
 * plus ~100 direct call sites) — upgrading it here propagates friendly
 * errors everywhere without touching call sites. Mirrors the layered
 * approach of the Dart PWA's `FriendlyError` (dart/packages/lynk_core), kept
 * in sync where error codes overlap (both apps hit the same Postgres/RLS
 * layer).
 */

import type { RepoError } from '@/lib/repositories/types';

/** Narrow, structural shape of a Supabase `AuthError`/`AuthApiError`. */
interface AuthErrorLike {
    name: string;
    message: string;
    code?: string;
    status?: number;
}

/** Narrow, structural shape of a PostgrestError/RepoError. */
interface PostgrestErrorLike {
    message: string;
    code?: string;
    details?: string | null;
    hint?: string | null;
}

/**
 * Returns `msg` when any candidate substring is found in any non-null
 * haystack (case-sensitive, matching the Dart `_matchAny` helper's
 * semantics); otherwise `undefined`.
 */
function matchAny(
    haystacks: Array<string | null | undefined>,
    candidates: string[],
    msg: string,
): string | undefined {
    return haystacks.some((h) => h != null && candidates.some((c) => h.includes(c))) ? msg : undefined;
}

/** True for a real `Error` instance whose `.name` marks it as a Supabase Auth error. */
function isAuthErrorLike(err: unknown): err is AuthErrorLike {
    return (
        err instanceof Error &&
        typeof (err as { name?: unknown }).name === 'string' &&
        (err as { name: string }).name.startsWith('Auth')
    );
}

/** True for a PostgrestError/RepoError-shaped object (has `message`, optionally `code`/`details`/`hint`). */
function isPostgrestErrorLike(err: unknown): err is PostgrestErrorLike {
    return (
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof (err as Record<string, unknown>).message === 'string' &&
        !isAuthErrorLike(err)
    );
}

/** True for a fetch-layer network failure (offline, DNS failure, connection refused). */
function isNetworkErrorLike(err: unknown): err is Error {
    if (!(err instanceof Error)) return false;
    if (err.name === 'AbortError') return true;
    if (typeof TypeError !== 'undefined' && err instanceof TypeError) {
        return matchAny([err.message], ['Failed to fetch', 'NetworkError', 'Load failed'], 'network') !== undefined;
    }
    return false;
}

// ── Layer 1: Network ────────────────────────────────────────────────────────

function friendlyNetwork(err: Error): string {
    if (err.name === 'AbortError') {
        return 'The request took too long to complete. Please try again in a moment.';
    }
    return 'A network connection issue occurred. Please check your internet connection and try again.';
}

// ── Layer 2: Supabase Auth errors ───────────────────────────────────────────

function friendlyAuth(err: AuthErrorLike): string {
    const c = err.code;
    const m = err.message;

    return (
        matchAny([c], ['invalid_credentials'], 'Incorrect email or password. Please try again.') ??
        matchAny([c], ['email_not_confirmed'], 'Please verify your email address before signing in.') ??
        matchAny([c], ['user_already_exists', 'email_exists', 'phone_exists', 'identity_already_exists'],
            'An account with these details already exists.') ??
        matchAny([c], ['weak_password'], 'The password provided is too weak. Please choose a stronger one.') ??
        matchAny([c], ['otp_expired', 'flow_state_expired'],
            'That code is incorrect or has expired. Please check it or request a new one.') ??
        matchAny([c], ['over_request_rate_limit', 'over_email_send_rate_limit', 'over_sms_send_rate_limit'],
            'Too many requests were made. Please wait a moment before trying again.') ??
        matchAny(
            [c],
            ['session_expired', 'session_not_found', 'refresh_token_not_found', 'refresh_token_already_used', 'bad_jwt'],
            'Your session has expired. Please sign in again.',
        ) ??
        matchAny([c], ['user_banned', 'user_not_found'],
            'This account is unavailable. Please contact support if this is unexpected.') ??
        matchAny([c], ['saml_provider_disabled', 'sso_provider_not_found', 'saml_idp_not_found'],
            'Single sign-on could not be completed. Please contact your administrator.') ??
        matchAny([c], ['no_authorization', 'not_admin'], 'You do not have permission to perform this action.') ??
        matchAny(
            [c],
            [
                'mfa_verification_failed', 'mfa_verification_rejected', 'insufficient_aal',
                'mfa_challenge_expired', 'mfa_factor_not_found',
            ],
            'Additional verification is required or failed. Please try again.',
        ) ??
        matchAny([m], ['Invalid'], 'Your credentials were rejected. Please try again.') ??
        rawMsgIfSafe(m) ??
        'The sign-in request could not be completed. Please try again.'
    );
}

// ── Layer 3: PostgREST / RepoError ──────────────────────────────────────────

function friendlyPostgrest(err: PostgrestErrorLike): string {
    const code = err.code;
    const m = err.message ?? '';

    // PGRST116: .single()/.maybeSingle() got zero or >1 rows.
    if (code === 'PGRST116') {
        return 'The requested record could not be found. Please try again.';
    }

    // Layer 0 — safe raw message passthrough
    const raw = rawMsgIfSafe(m);
    if (raw) return raw;

    // Layer 1 — RLS / authorization
    if (code === '42501' || m.includes('row-level security')) {
        return 'Access denied. You do not have permission to perform this action.';
    }

    return (
        friendlyConstraints(code, m) ??
        friendlyDataValidity(code, m) ??
        friendlySchema(code) ??
        friendlyTriggerMessage(m) ??
        'A database operation could not be completed. Please try again later.'
    );
}

function friendlyConstraints(code: string | undefined, m: string): string | undefined {
    return (
        matchAny([code, m], ['23505', 'duplicate key value'], 'This record already exists in our system.') ??
        matchAny(
            [code, m],
            ['23503', 'foreign key constraint'],
            'This item references another record that does not exist or has been deleted.',
        ) ??
        matchAny(
            [code, m],
            ['23514', 'check constraint'],
            'The request contains invalid parameters that violate system validation rules.',
        )
    );
}

function friendlyDataValidity(code: string | undefined, m: string): string | undefined {
    return (
        matchAny(
            [code, m],
            ['22001', 'value too long', 'string data, right-truncated'],
            'One of the submitted values is longer than the maximum allowed length.',
        ) ??
        matchAny([code, m], ['22P02', 'invalid input syntax', 'invalid text'],
            'One of the submitted values has an invalid format.') ??
        matchAny([code, m], ['22003', 'numeric value out of range'],
            'A numeric value in the request is too large or too small.')
    );
}

function friendlySchema(code: string | undefined): string | undefined {
    return matchAny(
        [code],
        ['42P01', 'undefined table'],
        'A server configuration error occurred. Our technical team has been notified.',
    );
}

function friendlyTriggerMessage(m: string): string | undefined {
    if (!m) return undefined;
    const lower = m.toLowerCase();

    return (
        matchAny(
            [lower],
            ['daily limit exceeded', 'monthly limit exceeded'],
            'You have reached your daily quota. The counter resets at midnight — please try again tomorrow.',
        ) ??
        matchAny(
            [lower],
            ['rate limit exceeded', 'too many requests'],
            'You are making requests too quickly. Please wait a moment before trying again.',
        ) ??
        matchAny(
            [lower],
            ['locked'],
            'This account has been temporarily locked due to repeated failed attempts. Please try again later.',
        ) ??
        matchAny(
            [lower],
            ['insufficient points', 'insufficient balance', 'insufficient tokens'],
            'You do not have enough balance for this action. Please top up your account.',
        ) ??
        matchAny(
            [lower],
            ['event is full', 'has reached capacity', 'sold out', 'capacity exceeded'],
            'This event is full and cannot accept more attendees.',
        )
    );
}

// ── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Returns the raw message verbatim when it's short and doesn't look like an
 * internal exception dump (no "Exception"/" error" substring, under 120
 * chars) — mirrors the Dart `_rawMsgIfSafe` passthrough so hand-written
 * PL/pgSQL `RAISE EXCEPTION` messages meant for end users pass through
 * unmodified instead of falling to the generic fallback.
 */
function rawMsgIfSafe(msg: string | undefined | null): string | undefined {
    if (!msg) return undefined;
    if (msg.includes('Exception')) return undefined;
    if (msg.toLowerCase().includes(' error')) return undefined;
    if (msg.length >= 120) return undefined;
    return msg;
}

/**
 * Extracts a human-readable message from an unknown catch value, mapping
 * known Supabase Auth/PostgREST/RepoError/network error shapes to friendly
 * text via the layered matchers above. Falls back to the raw `Error.message`
 * (or a generic string) for anything unrecognized, so this never throws and
 * never returns an empty string.
 */
export function getErrorMessage(err: unknown): string {
    if (isNetworkErrorLike(err)) return friendlyNetwork(err);
    if (isAuthErrorLike(err)) return friendlyAuth(err);
    if (isPostgrestErrorLike(err)) return friendlyPostgrest(err);
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object' && 'message' in err && typeof (err as Record<string, unknown>).message === 'string') {
        return (err as Record<string, string>).message;
    }
    return 'An unexpected error occurred';
}

/** Re-exported for callers that already have a typed `RepoError` and want to skip the `unknown` narrowing above. */
export function getRepoErrorMessage(err: RepoError): string {
    return friendlyPostgrest(err);
}
