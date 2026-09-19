"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { normalizeToE164 } from '@/utils/phone';
import { OTP_CODE_LENGTH } from '@/utils/otp';
import styles from './complete-contact-info.module.css';

type Stage = 'email' | 'email-code' | 'phone' | 'done';

/**
 * Mandatory one-time interstitial for accounts that predate OTP-based auth
 * (password/Google signups that only ever collected one identifier) or that
 * signed up before phone became a required field. Middleware redirects any
 * session missing email or phone here before letting it reach /dashboard,
 * /onboarding, or /setup-profile — mirrors /setup-profile's gate pattern,
 * just for a different piece of required account state.
 *
 * Email is verified via the real Supabase OTP-attach flow (updateUser +
 * verifyOTP type=email_change) since identity.user_profile.email can only
 * change through that trusted path (see tr_profiles_security). Phone is
 * only ever stored, not verified here — it becomes a valid OTP login
 * channel later, via a separate "Verify phone" step in account settings.
 */
export default function CompleteContactInfoPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get('next') || '/dashboard';
    const { user, profile, isLoading: isLoadingAuth, isLoadingProfile } = useAuth();
    const supabase = useMemo(() => createClient(), []);

    const [stage, setStage] = useState<Stage | null>(null);
    const [email, setEmail] = useState('');
    const [emailCode, setEmailCode] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Decide which field(s) are missing once profile has loaded, and pick
    // the first stage to show — email always comes first since it's the
    // one that needs real verification.
    useEffect(() => {
        if (isLoadingAuth || isLoadingProfile || stage !== null) return;

        const missingEmail = !profile?.email?.trim();
        const missingPhone = !profile?.phone_number?.trim();

        if (missingEmail) {
            setStage('email');
        } else if (missingPhone) {
            setStage('phone');
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
            // triggered by the auth-state-change listener) — query directly
            // rather than trust a possibly-stale closure value.
            if (!user) throw new Error('Session lost during verification.');
            const { data: freshProfile, error: fetchError } = await supabase
                .schema('api')
                .from('v1_profiles')
                .select('phone_number')
                .eq('id', user.id)
                .maybeSingle();
            if (fetchError) throw fetchError;

            const missingPhone = !freshProfile?.phone_number?.trim();
            setStage(missingPhone ? 'phone' : 'done');
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Invalid or expired code. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitPhone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !phone.trim()) {
            setError('Please enter a phone number.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const normalized = normalizeToE164(phone.trim(), '+254') || phone.trim();

            // Defensive: user_has_contact_info() (which routed us here)
            // returns false both when the row is missing AND when it exists
            // with empty fields, so a missing row is possible in principle
            // even though it shouldn't be for a session that reached this
            // page. api.v1_profiles has no INSTEAD OF INSERT rule, so
            // ensure the row exists before the update below.
            const { error: ensureError } = await supabase.schema('api').rpc('ensure_own_profile');
            if (ensureError) throw ensureError;

            // Stored as-is, not OTP-verified — phone_number isn't guarded by
            // tr_profiles_security the way email is, so this direct write is
            // allowed. It becomes a valid OTP login channel only once
            // separately confirmed via account settings' "Verify phone" flow.
            const { error: updateError } = await supabase
                .schema('api')
                .from('v1_profiles')
                .update({ phone_number: normalized })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setStage('done');
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to save phone number.');
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
                        {stage === 'phone' && 'Add Your Phone Number'}
                    </h1>
                    <p className={styles.subtitle}>
                        {stage === 'email' && 'We need an email on file so you can sign in with a one-time code, and recover your account if needed.'}
                        {stage === 'email-code' && `Enter the ${OTP_CODE_LENGTH}-digit code we just sent you.`}
                        {stage === 'phone' && 'A phone number gives you a backup way to sign in. You can verify it later from account settings.'}
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

                {stage === 'phone' && (
                    <form onSubmit={handleSubmitPhone} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Phone Number</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className={styles.input}
                                placeholder="+254 712 345 678"
                                required
                                autoFocus
                            />
                            <p className={styles.helperText}>You can confirm this number later from account settings to use it for sign-in.</p>
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Continue'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
