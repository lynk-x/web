/**
 * Validates a Kenyan phone number in any common format.
 * Accepts: 07xxxxxxxx, 01xxxxxxxx, +2547xxxxxxxx, 2547xxxxxxxx
 */
export function validateKenyanPhone(phone: string): boolean {
    const clean = phone.replace(/\s+/g, '');
    return /^(?:0|\+?254)[17]\d{8}$/.test(clean);
}

/**
 * Normalizes a Kenyan phone number to the 12-digit Safaricom format (254XXXXXXXXX).
 * Returns null if the number is invalid.
 */
export function normalizeKenyanPhone(phone: string): string | null {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    const match = cleaned.match(/^(?:\+?254|0)([17]\d{8})$/);
    return match ? `254${match[1]}` : null;
}

/**
 * Normalizes a national-format phone number to E.164 (+<dialCode><nationalNumber>)
 * given a country's dial code (e.g. "+254") and expected local digit count (from
 * api.v1_countries: phone_prefix/phone_digits). Accepts the number with or
 * without a leading 0 or the dial code already present, matching the same
 * leniency as normalizeKenyanPhone. Returns null if the digit count doesn't match.
 *
 * This is the canonical format for identity.user_profile.phone_number and for
 * Supabase Auth's signInWithOtp — keeping checkout's contact phone and the PWA
 * login phone on this same E.164 shape is what lets a returning guest's tickets
 * actually be found by phone later, instead of silently mismatching.
 */
export function normalizeToE164(rawPhone: string, dialCode: string, expectedDigits?: number): string | null {
    const cleanedDialDigits = dialCode.replace(/\D/g, '');
    let cleaned = rawPhone.replace(/[\s\-()]/g, '');

    if (cleaned.startsWith('+')) {
        cleaned = cleaned.slice(1);
    }
    if (cleaned.startsWith(cleanedDialDigits)) {
        cleaned = cleaned.slice(cleanedDialDigits.length);
    } else if (cleaned.startsWith('0')) {
        cleaned = cleaned.slice(1);
    }

    if (!/^\d+$/.test(cleaned)) return null;
    if (expectedDigits && cleaned.length !== expectedDigits) return null;
    if (!expectedDigits && (cleaned.length < 6 || cleaned.length > 14)) return null;

    return `+${cleanedDialDigits}${cleaned}`;
}
