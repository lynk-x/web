/**
 * Supabase project's email/SMS OTP code length, configured in the hosted
 * project's Auth settings (not in this repo) — currently 8 digits. Kept as
 * one constant so every OTP input's maxLength and "Enter the N-digit code"
 * copy stays in sync with each other and with the actual project setting.
 * Does not apply to TOTP authenticator codes (/mfa-challenge), which are
 * always 6 digits per RFC 6238 regardless of this setting.
 */
export const OTP_CODE_LENGTH = 8;
