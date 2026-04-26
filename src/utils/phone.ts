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
