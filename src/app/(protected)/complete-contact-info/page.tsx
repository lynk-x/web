"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { OTP_CODE_LENGTH } from '@/utils/otp';
import styles from './complete-contact-info.module.css';

type Stage = 'email' | 'email-code' | 'done';

/**
 * Mandatory one-time interstitial for accounts that predate OTP-based auth
 * (password/Google signups that only ever collected email or predate email
 * being required). Middleware redirects any session missing email here
 * before letting it reach /dashboard, /onboarding, or /setup-profile — phone
 * is collected separately, on /setup-profile alongside full_name/user_name,
 * not here.
 *
 * Email is verified via the real Supabase OTP-attach flow (updateUser +
 * verifyOTP type=email_change) since identity.user_profile.email can only
 * change through that trusted path (see tr_profiles_security).
 */
export default function CompleteContactInfoPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get('next') || '/dashboard';
    const { profile, isLoading: isLoadingAuth, isLoadingProfile, refreshProfile } = useAuth();
    const supabase = useMemo(() => createClient(), []);

    const [stage, setStage] = useState<Stage | null>(null);
    const [email, setEmail] = useState('');
    const [emailCode, setEmailCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Decide whether email is missing once profile has loaded.
    useEffect(() => {
        if (isLoadingAuth || isLoadingProfile || stage !== null) return;

        const missingEmail = !profile?.email?.trim();

        if (missingEmail) {
            setStage('email');
        } else {
            // Nothing missing (e.g. reached directly, or resolved in another
            // tab) — nothing to do here.
            router.replace(next);
        }
    }, [isLoadingAuth, isLoadingProfile, profile, stage, next, router]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const handleSendEmailCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Please enter an email address.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            // Attaches email to the current session and sends it a code —
            // the same mechanism the PWA's account settings already uses to
            // add/change a contact identifier post-signup.
            const { error: updateError } = await supabase.auth.updateUser({ email: email.trim() });
            if (updateError) throw updateError;

            setNotice(`We sent a ${OTP_CODE_LENGTH}-digit code to ${email.trim()}.`);
            setResendCooldown(30);
            setStage('email-code');
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to send verification code.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendEmailCode = async () => {
        if (resendCooldown > 0) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ email: email.trim() });
            if (updateError) throw updateError;
            setNotice(`Sent a new code to ${email.trim()}.`);
            setResendCooldown(30);
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to resend code.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyEmailCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailCode.trim()) {
            setError('Please enter the code.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email: email.trim(),
                token: emailCode.trim(),
                type: 'email_change',
            });
            if (verifyError) throw verifyError;

            setNotice(null);
            setEmailCode('');

            // handle_user_update() syncs auth.users.email into user_profile
            // as part of this same verifyOtp call, but AuthContext's own
            // `profile` may not have re-fetched yet (its refresh is async,
            // triggered by the auth-state-change listener) — force it so the
            // next page (whichever the middleware redirects to) doesn't
            // render against stale context state after the client-side
            // navigation below, since that redirect doesn't remount
            // AuthProvider the way a full page load would.
            await refreshProfile();

            setStage('done');
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Invalid or expired code. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (stage === 'done') {
            router.push(next);
        }
    }, [stage, next, router]);

    // Render nothing until we know which stage to show — avoids flashing an
    // empty/wrong-stage form before the profile load resolves.
    if (stage === null || stage === 'done') {
        return <div className={styles.container} />;
    }

    return (
        <div className={styles.container}>
            <div className={styles.setupCard}>
                <div className={styles.header}>
                    <p className={styles.stepLabel}>Account Setup</p>
                    <h1 className={styles.title}>
                        {stage === 'email' && 'Add Your Email Address'}
                        {stage === 'email-code' && 'Confirm Your Email'}
                    </h1>
                    <p className={styles.subtitle}>
                        {stage === 'email' && 'We need an email on file so you can sign in with a one-time code, and recover your account if needed.'}
                        {stage === 'email-code' && `Enter the ${OTP_CODE_LENGTH}-digit code we just sent you.`}
                    </p>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}
                {notice && !error && <div className={styles.successBox}>{notice}</div>}

                {stage === 'email' && (
                    <form onSubmit={handleSendEmailCode} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={styles.input}
                                placeholder="you@example.com"
                                required
                                autoFocus
                            />
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                            {isSubmitting ? 'Sending...' : 'Send Code'}
                        </button>
                    </form>
                )}

                {stage === 'email-code' && (
                    <form onSubmit={handleVerifyEmailCode} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>{OTP_CODE_LENGTH}-Digit Code</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={OTP_CODE_LENGTH}
                                value={emailCode}
                                onChange={(e) => setEmailCode(e.target.value)}
                                className={styles.codeInput}
                                placeholder={'0'.repeat(OTP_CODE_LENGTH)}
                                required
                                autoFocus
                            />
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                            {isSubmitting ? 'Verifying...' : 'Verify Code'}
                        </button>
                        <button
                            type="button"
                            className={styles.linkBtn}
                            onClick={handleResendEmailCode}
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
