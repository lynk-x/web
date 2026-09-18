'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { normalizeToE164 } from '@/utils/phone';
import { getErrorMessage } from '@/utils/error';
import styles from './page.module.css';
import { login } from './actions';

type LoginMethod = 'password' | 'otp';
type OtpStage = 'request' | 'verify';

/**
 * Login view — password sign-in, one-time-code sign-in (email or phone),
 * and Google OAuth SSO. Sign-up lives at /signup (see SignupPage.tsx),
 * a separate component since it dropped passwords entirely and no longer
 * shares enough markup with login to justify one shared component.
 *
 * Handles toggleable input fields for email/phone, in-place error reporting
 * without page reloads, and smooth router navigation post-authentication.
 */
export default function AuthPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const serverError = searchParams.get('error');
    const serverMessage = searchParams.get('message');
    // Preserve ?next= so the server action can redirect the user back after login.
    const next = searchParams.get('next') || '';
    const nextQuery = next ? `?next=${encodeURIComponent(next)}` : '';

    const [showPassword, setShowPassword] = useState(false);
    const [useEmail, setUseEmail] = useState(false);
    const [formError, setFormError] = useState<string | null>(serverError || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOAuthPending, setIsOAuthPending] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    // Password vs. one-time-code, offered as an alternative to password
    // sign-in (not a replacement yet — see /complete-contact-info and the
    // OTP migration plan this is step 2 of).
    const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
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

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError(null);
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);

        try {
            const res = await login(formData);
            if (res.error) {
                setFormError(res.error);
                setIsSubmitting(false);
            } else if (res.redirectTo) {
                router.push(res.redirectTo);
            }
        } catch (err: unknown) {
            console.error('[AuthPage] Authentication error:', err);
            setFormError(getErrorMessage(err) || 'An error occurred during authentication.');
            setIsSubmitting(false);
        }
    };

    // After ANY successful sign-in (password or OTP), check whether MFA
    // still needs to run before granting access — mirrors the check
    // actions.ts's login() does server-side for the password path, since
    // AAL is a session property, not tied to which factor established it.
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
            <p className={styles.subtitle}>Fill out the information below in order to access your account.</p>

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

            <div className={styles.toggleWrapper}>
                <button
                    type="button"
                    className={styles.toggleButton}
                    onClick={() => {
                        setFormError(null);
                        setLoginMethod(loginMethod === 'password' ? 'otp' : 'password');
                        setOtpStage('request');
                    }}
                >
                    {loginMethod === 'password' ? 'Sign in with a one-time code instead' : 'Sign in with a password instead'}
                </button>
            </div>

            {loginMethod === 'otp' ? (
                otpStage === 'request' ? (
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
                    </form>
                )
            ) : (
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.toggleWrapper}>
                        <button
                            type="button"
                            className={styles.toggleButton}
                            onClick={() => setUseEmail(!useEmail)}
                        >
                            {useEmail ? 'Use Phone Number instead' : 'Use Email instead'}
                        </button>
                    </div>

                    <div className={styles.inputWrapper}>
                        {useEmail ? (
                            <>
                                <input
                                    name="email"
                                    type="email"
                                    placeholder="Email Address"
                                    className={styles.input}
                                    required
                                />
                                <div className={styles.modeIcon}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                </div>
                            </>
                        ) : (
                            <>
                                <input
                                    name="phone"
                                    type="tel"
                                    placeholder="Phone Number (e.g. +254...)"
                                    className={styles.input}
                                    required
                                />
                                <div className={styles.modeIcon}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                </div>
                            </>
                        )}
                    </div>

                    <div className={styles.inputWrapper}>
                        <input
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            className={styles.input}
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            className={styles.eyeIcon}
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.94 17.94A10.07 10.07 0 0112 20C7.03 20 3 15.5 3 10C3 8.19 3.8 6.55 5.06 5.06M9.9 4.24A9.12 9.12 0 0112 4C17 4 21 8.5 21 14C21 15.35 20.66 16.63 20.06 17.8L9.9 4.24zM1 1L23 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </button>
                    </div>

                    {/* Hidden field so the server action knows where to redirect after login */}
                    {next && (
                        <div style={{ display: 'none' }}>
                            <input name="next" value={next} readOnly />
                        </div>
                    )}

                    <button type="submit" className={styles.signInBtn} disabled={isSubmitting} aria-busy={isSubmitting}>
                        {isSubmitting ? 'Please wait...' : 'Sign In'}
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

            {loginMethod === 'password' && (
                <div className={styles.forgotPassword}>
                    <Link href="/forgot-password" className={styles.forgotPasswordLink}>Forgot Password?</Link>
                </div>
            )}

            <div className={styles.footer}>
                <Link href={`/signup${nextQuery}`} className={styles.footerLink}>
                    Create Account
                </Link>
                <Link href={`/login${nextQuery}`} className={`${styles.footerLink} ${styles.activeLink}`}>
                    Log In
                </Link>
            </div>
        </div>
    );
}
