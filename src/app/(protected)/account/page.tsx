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

/**
 * Personal account settings — currently just contact-info verification
 * status. Phone here is "stored" (identity.user_profile.phone_number,
 * possibly self-reported and never confirmed — see /complete-contact-info
 * and /signup) versus "verified" (matches auth.users.phone, meaning it
 * went through a real Supabase OTP flow at some point). Verifying here is
 * what promotes a stored-only phone into a valid OTP login channel,
 * per the OTP-login migration this is step 4 of.
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

    const storedPhone = profile?.phone_number?.trim() || null;
    const isPhoneVerified = Boolean(storedPhone && authPhone && storedPhone === authPhone);

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
                        <p className={styles.cardValue}>{profile?.email || user?.email || 'Not set'}</p>
                    </div>
                    {(profile?.email || user?.email) && (
                        <span className={`${styles.badge} ${user?.email_confirmed_at ? styles.badgeVerified : styles.badgeUnverified}`}>
                            {user?.email_confirmed_at ? 'Verified' : 'Unverified'}
                        </span>
                    )}
                </div>
                <p className={styles.cardDesc}>
                    {user?.email_confirmed_at
                        ? 'Your email can only be changed through a verification code — this keeps it always trustworthy as a sign-in method.'
                        : "This email hasn't been confirmed yet. Check your inbox for a confirmation link, or use email sign-in to confirm it automatically."}
                </p>
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
