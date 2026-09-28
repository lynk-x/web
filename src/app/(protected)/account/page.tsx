"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { normalizeToE164 } from '@/utils/phone';
import { OTP_CODE_LENGTH } from '@/utils/otp';
import PageHeader from '@/components/dashboard/PageHeader';
import styles from './account.module.css';

type PhoneStage = 'idle' | 'enter' | 'code';
type EmailStage = 'idle' | 'enter' | 'code';

/**
 * Personal account settings — contact-info verification status for both
 * email and phone. Phone is "stored" (identity.user_profile.phone_number,
 * possibly self-reported and never confirmed) versus "verified" (matches
 * auth.users.phone, meaning it went through a real Supabase OTP flow at some
 * point) — verifying here is what promotes a stored-only phone into a valid
 * OTP login channel. Email's add/change flow lives here too (replacing the
 * old full-page /complete-contact-info interstitial) for legacy accounts
 * (pre-OTP-migration password/Google signups) still missing one — every
 * current signup path (web /signup, PWA, Google OAuth) already guarantees
 * email upfront, so this only matters for that shrinking legacy population.
 */
export default function AccountPage() {
    const { user, profile, isLoadingProfile } = useAuth();
    const supabase = useMemo(() => createClient(), []);

    const [authPhone, setAuthPhone] = useState<string | null>(null);
    const [stage, setStage] = useState<PhoneStage>('idle');
    const [phoneInput, setPhoneInput] = useState('');
    const [code, setCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    const [emailStage, setEmailStage] = useState<EmailStage>('idle');
    const [emailInput, setEmailInput] = useState('');
    const [emailCode, setEmailCode] = useState('');
    const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [emailNotice, setEmailNotice] = useState<string | null>(null);
    const [emailResendCooldown, setEmailResendCooldown] = useState(0);

    // auth.users.phone (not identity.user_profile.phone_number) is the
    // source of truth for "actually OTP-verified" — refetched independently
    // of AuthContext's `user` so this page reflects a just-completed
    // verification immediately rather than waiting on context refresh timing.
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setAuthPhone(data.user?.phone || null);
        });
    }, [supabase]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    useEffect(() => {
        if (emailResendCooldown <= 0) return;
        const timer = setTimeout(() => setEmailResendCooldown((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [emailResendCooldown]);

    const storedPhone = profile?.phone_number?.trim() || null;
    const isPhoneVerified = Boolean(storedPhone && authPhone && storedPhone === authPhone);
    const storedEmail = profile?.email?.trim() || user?.email?.trim() || null;

    const handleStartVerify = () => {
        setError(null);
        setNotice(null);
        setPhoneInput(storedPhone || '');
        setStage('enter');
    };

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = phoneInput.trim();
        if (!trimmed) {
            setError('Please enter a phone number.');
            return;
        }

        setError(null);
        setIsSubmitting(true);
        try {
            const normalized = normalizeToE164(trimmed, '+254') || trimmed;
            // Attaches this phone to the current session and sends it a
            // code — the same mechanism the PWA's account settings already
            // uses to add/change a contact identifier post-signup.
            const { error: updateError } = await supabase.auth.updateUser({ phone: normalized });
            if (updateError) throw updateError;

            setPhoneInput(normalized);
            setNotice(`We sent a ${OTP_CODE_LENGTH}-digit code to ${normalized}.`);
            setResendCooldown(30);
            setStage('code');
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to send verification code.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendCode = async () => {
        if (resendCooldown > 0) return;
        setError(null);
        setIsSubmitting(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ phone: phoneInput.trim() });
            if (updateError) throw updateError;
            setNotice(`Sent a new code to ${phoneInput.trim()}.`);
            setResendCooldown(30);
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to resend code.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) {
            setError('Please enter the code.');
            return;
        }

        setError(null);
        setIsSubmitting(true);
        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                phone: phoneInput.trim(),
                token: code.trim(),
                type: 'phone_change',
            });
            if (verifyError) throw verifyError;

            // handle_user_update() syncs auth.users.phone into
            // identity.user_profile.phone_number as part of this same
            // request, so both are already consistent — just re-read
            // auth.users.phone directly for this page's own verified check.
            const { data } = await supabase.auth.getUser();
            setAuthPhone(data.user?.phone || null);

            setNotice(null);
            setCode('');
            setStage('idle');
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Invalid or expired code. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStartAddEmail = () => {
        setEmailError(null);
        setEmailNotice(null);
        setEmailInput(storedEmail || '');
        setEmailStage('enter');
    };

    const handleSendEmailCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = emailInput.trim();
        if (!trimmed) {
            setEmailError('Please enter an email address.');
            return;
        }

        setEmailError(null);
        setIsEmailSubmitting(true);
        try {
            // Attaches this email to the current session and sends it a code
            // — same mechanism the phone flow above uses for phone.
            const { error: updateError } = await supabase.auth.updateUser({ email: trimmed });
            if (updateError) throw updateError;

            setEmailNotice(`We sent a ${OTP_CODE_LENGTH}-digit code to ${trimmed}.`);
            setEmailResendCooldown(30);
            setEmailStage('code');
        } catch (err: unknown) {
            setEmailError(getErrorMessage(err) || 'Failed to send verification code.');
        } finally {
            setIsEmailSubmitting(false);
        }
    };

    const handleResendEmailCode = async () => {
        if (emailResendCooldown > 0) return;
        setEmailError(null);
        setIsEmailSubmitting(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ email: emailInput.trim() });
            if (updateError) throw updateError;
            setEmailNotice(`Sent a new code to ${emailInput.trim()}.`);
            setEmailResendCooldown(30);
        } catch (err: unknown) {
            setEmailError(getErrorMessage(err) || 'Failed to resend code.');
        } finally {
            setIsEmailSubmitting(false);
        }
    };

    const handleVerifyEmailCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailCode.trim()) {
            setEmailError('Please enter the code.');
            return;
        }

        setEmailError(null);
        setIsEmailSubmitting(true);
        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email: emailInput.trim(),
                token: emailCode.trim(),
                type: 'email_change',
            });
            if (verifyError) throw verifyError;

            // No identity.user_profile row is guaranteed to exist for a
            // legacy account reaching this page (only /signup and
            // /dashboard/organize onboarding create one today) — ensure it
            // exists so handle_user_update()'s sync UPDATE below has a row
            // to land on rather than silently affecting zero rows.
            const { error: ensureError } = await supabase.schema('api').rpc('ensure_own_profile');
            if (ensureError) throw ensureError;

            setEmailNotice(null);
            setEmailCode('');
            setEmailStage('idle');
        } catch (err: unknown) {
            setEmailError(getErrorMessage(err) || 'Invalid or expired code. Please try again.');
        } finally {
            setIsEmailSubmitting(false);
        }
    };

    if (isLoadingProfile) {
        return <div className={styles.container} />;
    }

    return (
        <div className={styles.container}>
            <PageHeader title="Account" subtitle="Manage your personal identity and sign-in methods." />

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div>
                        <h3 className={styles.cardTitle}>Email Address</h3>
                        <p className={styles.cardValue}>{storedEmail || 'Not set'}</p>
                    </div>
                    {storedEmail ? (
                        <span className={`${styles.badge} ${user?.email_confirmed_at ? styles.badgeVerified : styles.badgeUnverified}`}>
                            {user?.email_confirmed_at ? 'Verified' : 'Unverified'}
                        </span>
                    ) : (
                        <span className={`${styles.badge} ${styles.badgeNone}`}>Not set</span>
                    )}
                </div>

                {!user?.email_confirmed_at && (
                    <p className={styles.cardDesc}>
                        {storedEmail
                            ? "This email hasn't been confirmed yet. Verify it to use it as a sign-in method."
                            : 'Add an email so you can sign in with a one-time code, and recover your account if needed.'}
                    </p>
                )}

                {emailError && <div className={styles.errorBox} style={{ marginBottom: 12 }}>{emailError}</div>}
                {emailNotice && !emailError && <div className={styles.successBox} style={{ marginBottom: 12 }}>{emailNotice}</div>}

                {user?.email_confirmed_at ? null : emailStage === 'idle' ? (
                    <button type="button" className={styles.btn} onClick={handleStartAddEmail}>
                        {storedEmail ? 'Verify Email Address' : 'Add Email Address'}
                    </button>
                ) : emailStage === 'enter' ? (
                    <form className={styles.form} onSubmit={handleSendEmailCode}>
                        <div className={styles.inputRow}>
                            <input
                                type="email"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                placeholder="you@example.com"
                                className={styles.input}
                                required
                                autoFocus
                            />
                            <button type="submit" className={styles.btn} disabled={isEmailSubmitting}>
                                {isEmailSubmitting ? 'Sending...' : 'Send Code'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form className={styles.form} onSubmit={handleVerifyEmailCode}>
                        <div className={styles.inputRow}>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={OTP_CODE_LENGTH}
                                value={emailCode}
                                onChange={(e) => setEmailCode(e.target.value)}
                                placeholder={'0'.repeat(OTP_CODE_LENGTH)}
                                className={styles.codeInput}
                                required
                                autoFocus
                            />
                            <button type="submit" className={styles.btn} disabled={isEmailSubmitting}>
                                {isEmailSubmitting ? 'Verifying...' : 'Verify'}
                            </button>
                        </div>
                        <button
                            type="button"
                            className={styles.linkBtn}
                            onClick={handleResendEmailCode}
                            disabled={isEmailSubmitting || emailResendCooldown > 0}
                        >
                            {emailResendCooldown > 0 ? `Resend code (${emailResendCooldown}s)` : 'Resend code'}
                        </button>
                    </form>
                )}
            </div>

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div>
                        <h3 className={styles.cardTitle}>Phone Number</h3>
                        <p className={styles.cardValue}>{storedPhone || 'Not set'}</p>
                    </div>
                    {storedPhone ? (
                        <span className={`${styles.badge} ${isPhoneVerified ? styles.badgeVerified : styles.badgeUnverified}`}>
                            {isPhoneVerified ? 'Verified' : 'Unverified'}
                        </span>
                    ) : (
                        <span className={`${styles.badge} ${styles.badgeNone}`}>Not set</span>
                    )}
                </div>

                {!isPhoneVerified && (
                    <p className={styles.cardDesc}>
                        {storedPhone
                            ? "This number is on file but hasn't been confirmed. Verify it to use it as a sign-in method."
                            : 'Add a phone number as a backup way to sign in.'}
                    </p>
                )}

                {error && <div className={styles.errorBox} style={{ marginBottom: 12 }}>{error}</div>}
                {notice && !error && <div className={styles.successBox} style={{ marginBottom: 12 }}>{notice}</div>}

                {isPhoneVerified ? null : stage === 'idle' ? (
                    <button type="button" className={styles.btn} onClick={handleStartVerify}>
                        {storedPhone ? 'Verify Phone Number' : 'Add Phone Number'}
                    </button>
                ) : stage === 'enter' ? (
                    <form className={styles.form} onSubmit={handleSendCode}>
                        <div className={styles.inputRow}>
                            <input
                                type="tel"
                                value={phoneInput}
                                onChange={(e) => setPhoneInput(e.target.value)}
                                placeholder="+254 712 345 678"
                                className={styles.input}
                                required
                                autoFocus
                            />
                            <button type="submit" className={styles.btn} disabled={isSubmitting}>
                                {isSubmitting ? 'Sending...' : 'Send Code'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form className={styles.form} onSubmit={handleVerifyCode}>
                        <div className={styles.inputRow}>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={OTP_CODE_LENGTH}
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder={'0'.repeat(OTP_CODE_LENGTH)}
                                className={styles.codeInput}
                                required
                                autoFocus
                            />
                            <button type="submit" className={styles.btn} disabled={isSubmitting}>
                                {isSubmitting ? 'Verifying...' : 'Verify'}
                            </button>
                        </div>
                        <button
                            type="button"
                            className={styles.linkBtn}
                            onClick={handleResendCode}
                            disabled={isSubmitting || resendCooldown > 0}
                        >
                            {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
