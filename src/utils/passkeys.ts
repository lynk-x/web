import type { createClient } from '@/utils/supabase/client';

type BrowserSupabase = ReturnType<typeof createClient>;

/** A passkey the person has registered, as a second sign-in factor. */
export interface Passkey {
    id: string;
    name: string;
}

export type PasskeyResult =
    | { ok: true }
    | { ok: false; cancelled: boolean; message: string };

/** True when this browser can create and use passkeys (it needs HTTPS and WebAuthn support). */
export function isPasskeySupported(): boolean {
    return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';
}

/**
 * Turns a failed passkey call into a result. Dismissing the browser or phone prompt is reported as cancelled, so
 * callers can stay quiet instead of showing an error for something the person chose to do.
 */
function toFailure(error: unknown, fallback: string): PasskeyResult {
    const err = error as { name?: string; code?: string; message?: string; cause?: { name?: string } } | null;
    const cancelled =
        err?.code === 'ERROR_CEREMONY_ABORTED' ||
        err?.name === 'NotAllowedError' ||
        err?.cause?.name === 'NotAllowedError';
    return { ok: false, cancelled, message: cancelled ? 'The passkey prompt was dismissed.' : err?.message || fallback };
}

/** The person's verified passkeys, in the order the server returns them. */
export async function listPasskeys(supabase: BrowserSupabase): Promise<Passkey[]> {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error || !data) return [];
    return data.webauthn
        .filter((factor) => factor.status === 'verified')
        .map((factor) => ({ id: factor.id, name: factor.friendly_name || 'Passkey' }));
}

/** Registers a new passkey on this device. Completing it also raises the session to the second-factor level. */
export async function registerPasskey(supabase: BrowserSupabase, name: string): Promise<PasskeyResult> {
    try {
        const { error } = await supabase.auth.mfa.webauthn.register({ friendlyName: name });
        if (error) return toFailure(error, 'Could not add the passkey.');
        return { ok: true };
    } catch (error) {
        return toFailure(error, 'Could not add the passkey.');
    }
}

/** Proves possession of an existing passkey. On success the session is at the second-factor level. */
export async function verifyWithPasskey(supabase: BrowserSupabase, factorId: string): Promise<PasskeyResult> {
    try {
        const { error } = await supabase.auth.mfa.webauthn.authenticate({ factorId });
        if (error) return toFailure(error, 'Passkey verification failed.');
        return { ok: true };
    } catch (error) {
        return toFailure(error, 'Passkey verification failed.');
    }
}
