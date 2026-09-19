'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { normalizeToE164 } from '@/utils/phone';
import { getErrorMessage } from '@/utils/error';
import ReportIssueModal from './ReportIssueModal';
import styles from './page.module.css';

type OtpStage = 'request' | 'verify';

/**
 * Login view — one-time-code sign-in (email or phone) and Google OAuth SSO.
 * Password sign-in was retired once /complete-contact-info made it
 * guaranteed that every account (however it originally signed up) has an
 * email on file by the time it reaches /dashboard, which is all OTP login
 * needs. Sign-up lives at /signup (see SignupPage.tsx).
 */
export default function AuthPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const serverError = searchParams.get('error');
    const serverMessage = searchParams.get('message');
    // Preserve ?next= so the server action can redirect the user back after login.
    const next = searchParams.get('next') || '';
    const nextQuery = next ? `?next=${encodeURIComponent(next)}` : '';

    const [formError, setFormError] = useState<string | null>(serverError || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOAuthPending, setIsOAuthPending] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const [otpStage, setOtpStage] = useState<OtpStage>('request');
    const [otpIdentifier, setOtpIdentifier] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpResendCooldown, setOtpResendCooldown] = useState(0);

    useEffect(() => {
        if (otpResendCooldown <= 0) return;
        const timer = setTimeout(() => setOtpResendCooldown((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [otpResendCooldown]);

    // Automatically bypass login page if user already possesses an active session.
    // Gated behind isCheckingSession so the form never flashes before this
    // resolves — see the render guard below.
    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                router.replace(next || '/dashboard');
            } else {
                setIsCheckingSession(false);
            }
        });
    }, [next, router]);

    // After ANY successful sign-in, check whether MFA still needs to run
    // before granting access — AAL is a session property, independent of
    // which factor (OTP or OAuth) established it.
    const afterSignedIn = async () => {
        const supabase = createClient();
        const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (!mfaError && mfaData && mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
            router.push(`/mfa-challenge?next=${encodeURIComponent(next || '/dashboard')}`);
            return;
        }
        router.push(next || '/dashboard');
    };

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = otpIdentifier.trim();
        if (!trimmed) {
            setFormError('Please enter an email address or phone number.');
            return;
        }

        setFormError(null);
        setIsSubmitting(true);
        try {
            const supabase = createClient();
            const isEmailIdentifier = trimmed.includes('@');
            const { error } = await supabase.auth.signInWithOtp(
                isEmailIdentifier
                    ? { email: trimmed, options: { shouldCreateUser: false } }
                    : { phone: normalizeToE164(trimmed, '+254') || trimmed, options: { shouldCreateUser: false } }
            );

            if (error) throw error;

            setOtpResendCooldown(30);
            setOtpStage('verify');
        } catch (err: unknown) {
            setFormError(getErrorMessage(err) || 'Failed to send a one-time code. Please check the details and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendOtp = async () => {
        if (otpResendCooldown > 0) return;
        const trimmed = otpIdentifier.trim();
        setIsSubmitting(true);
        setFormError(null);
        try {
            const supabase = createClient();
            const isEmailIdentifier = trimmed.includes('@');
            const { error } = await supabase.auth.signInWithOtp(
                isEmailIdentifier
                    ? { email: trimmed, options: { shouldCreateUser: false } }
                    : { phone: normalizeToE164(trimmed, '+254') || trimmed, options: { shouldCreateUser: false } }
            );
            if (error) throw error;
            setOtpResendCooldown(30);
        } catch (err: unknown) {
            setFormError(getErrorMessage(err) || 'Failed to resend the code.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = otpIdentifier.trim();
        const code = otpCode.trim();
        if (!code) {
            setFormError('Please enter the code.');
            return;
        }

        setFormError(null);
        setIsSubmitting(true);
        try {
            const supabase = createClient();
            const isEmailIdentifier = trimmed.includes('@');
            const { error } = await supabase.auth.verifyOtp(
                isEmailIdentifier
                    ? { email: trimmed, token: code, type: 'email' }
                    : { phone: normalizeToE164(trimmed, '+254') || trimmed, token: code, type: 'sms' }
            );

            if (error) throw error;

            await afterSignedIn();
        } catch (err: unknown) {
            setFormError(getErrorMessage(err) || 'Invalid or expired code. Please try again.');
            setIsSubmitting(false);
        }
    };

    // Render nothing while checking for an existing session, rather than
    // flashing the full form before redirecting an already-logged-in user
    // away.
    if (isCheckingSession) {
        return <div className={styles.container} />;
    }

    return (
        <div className={styles.container}>
            <div className={styles.logoWrapper}>
                <Image
                    src="/lynk-x_combined_logo.svg"
                    alt="Lynk-X"
                    width={180}
                    height={60}
                    style={{ objectFit: 'cover' }}
                    priority
                />
            </div>

            <h1 className={styles.title}>Welcome Back</h1>
            <p className={styles.subtitle}>Enter your email or phone number and we&apos;ll send you a one-time code.</p>

            {formError && (
                <div style={{ color: 'var(--color-interface-error)', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
                    {formError}
                </div>
            )}

            {serverMessage && !formError && (
                <div style={{ color: 'var(--color-interface-success)', background: 'rgba(34,197,94,0.1)', padding: '12px', borderRadius: '8px', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
                    {serverMessage}
                </div>
            )}

            {otpStage === 'request' ? (
                <form className={styles.form} onSubmit={handleRequestOtp}>
                    <div className={styles.inputWrapper}>
                        <input
                            type="text"
                            value={otpIdentifier}
                            onChange={(e) => setOtpIdentifier(e.target.value)}
                            placeholder="Email or Phone Number"
                            className={styles.input}
                            required
                            autoFocus
                        />
                    </div>
                    <button type="submit" className={styles.signInBtn} disabled={isSubmitting} aria-busy={isSubmitting}>
                        {isSubmitting ? 'Sending...' : 'Send Code'}
                    </button>
                </form>
            ) : (
                <form className={styles.form} onSubmit={handleVerifyOtp}>
                    <p className={styles.subtitle} style={{ marginTop: 0 }}>
                        Enter the 6-digit code sent to {otpIdentifier}.
                    </p>
                    <div className={styles.inputWrapper}>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            placeholder="000000"
                            className={styles.input}
                            style={{ textAlign: 'center', letterSpacing: '4px', fontFamily: 'monospace' }}
                            required
                            autoFocus
                        />
                    </div>
                    <button type="submit" className={styles.signInBtn} disabled={isSubmitting} aria-busy={isSubmitting}>
                        {isSubmitting ? 'Verifying...' : 'Verify Code'}
                    </button>
                    <button
                        type="button"
                        className={styles.toggleButton}
                        onClick={handleResendOtp}
                        disabled={isSubmitting || otpResendCooldown > 0}
                    >
                        {otpResendCooldown > 0 ? `Resend code (${otpResendCooldown}s)` : 'Resend code'}
                    </button>
                    <button
                        type="button"
                        className={styles.toggleButton}
                        onClick={() => {
                            setFormError(null);
                            setOtpCode('');
                            setOtpStage('request');
                        }}
                    >
                        Use a different email or phone number
                    </button>
                </form>
            )}

            <div className={styles.divider}>Or sign in with</div>

            <button
                type="button"
                className={styles.socialBtn}
                disabled={isOAuthPending}
                aria-busy={isOAuthPending}
                onClick={async () => {
                    setIsOAuthPending(true);
                    const supabase = createClient();
                    const { error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                            redirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`,
                        },
                    });
                    if (error) setIsOAuthPending(false);
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.35 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.32H19.26C21.34 18.4 22.56 15.6 22.56 12.25Z" fill="#4285F4" />
                    <path d="M12 23C14.97 23 17.46 22.014 19.26 20.35L15.71 17.6C14.73 18.26 13.48 18.66 12 18.66C9.13 18.66 6.71 16.72 5.84 14.11H2.18V16.95C3.98 20.53 7.7 23 12 23Z" fill="#34A853" />
                    <path d="M5.84 14.11C5.61 13.43 5.49 12.72 5.49 12C5.49 11.28 5.61 10.57 5.84 9.89V7.05H2.18C1.43 8.55 1 10.22 1 12C1 13.78 1.43 15.45 2.18 16.95L5.84 14.11Z" fill="#FBBC05" />
                    <path d="M12 5.38C13.62 5.38 15.06 5.94 16.2 7.02L18.65 4.57C16.95 2.99 14.68 2 12 2C7.7 2 3.98 4.47 2.18 8.05L5.84 10.89C6.71 8.28 9.13 6.34 12 5.38Z" fill="#EA4335" />
                </svg>
                {isOAuthPending ? 'Redirecting...' : 'Continue with Google'}
            </button>

            <div className={styles.footer}>
                <Link href={`/signup${nextQuery}`} className={styles.footerLink}>
                    Create Account
                </Link>
                <Link href={`/login${nextQuery}`} className={`${styles.footerLink} ${styles.activeLink}`}>
                    Log In
                </Link>
            </div>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button
                    type="button"
                    onClick={() => setIsReportModalOpen(true)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}
                >
                    Trouble logging in? Report an issue
                </button>
            </div>

            <ReportIssueModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                identifier={otpIdentifier.trim() || undefined}
                subject="Failed login (web)"
            />
        </div>
    );
}
