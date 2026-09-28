'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getErrorMessage } from '@/utils/error';
import { OTP_CODE_LENGTH } from '@/utils/otp';
import ReportIssueModal from './ReportIssueModal';
import styles from './page.module.css';

type SignupStage = 'email' | 'email-code';

/**
 * OTP-based sign-up — email is the primary identifier, verified with an
 * OTP_CODE_LENGTH-digit code (creates the auth.users row). Full name,
 * username, and phone number are all collected together afterward on
 * /setup-profile (the middleware's user_has_complete_profile gate routes
 * there automatically) rather than as further stages here. Kept as its own
 * component (not folded into AuthPage, which owns the OTP LOGIN path) since
 * signup's shape doesn't share enough markup with login to justify one
 * shared component.
 */
export default function SignupPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get('next') || '';
    const nextQuery = next ? `?next=${encodeURIComponent(next)}` : '';

    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [stage, setStage] = useState<SignupStage>('email');
    const [email, setEmail] = useState('');
    const [emailCode, setEmailCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOAuthPending, setIsOAuthPending] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // Bypass sign-up if already logged in — same guard as AuthPage's login form.
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

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const handleSendEmailCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setFormError('Please enter an email address.');
            return;
        }

        setFormError(null);
        setIsSubmitting(true);
        try {
            const supabase = createClient();
            // shouldCreateUser defaults true — this is what actually creates
            // the auth.users row once the code is verified.
            const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
            if (error) throw error;

            setNotice(`We sent a ${OTP_CODE_LENGTH}-digit code to ${email.trim()}.`);
            setResendCooldown(30);
            setStage('email-code');
        } catch (err: unknown) {
            setFormError(getErrorMessage(err) || 'Failed to send verification code.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendEmailCode = async () => {
        if (resendCooldown > 0) return;
        setFormError(null);
        setIsSubmitting(true);
        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
            if (error) throw error;
            setNotice(`Sent a new code to ${email.trim()}.`);
            setResendCooldown(30);
        } catch (err: unknown) {
            setFormError(getErrorMessage(err) || 'Failed to resend code.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyEmailCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailCode.trim()) {
            setFormError('Please enter the code.');
            return;
        }

        setFormError(null);
        setIsSubmitting(true);
        try {
            const supabase = createClient();
            const { error } = await supabase.auth.verifyOtp({
                email: email.trim(),
                token: emailCode.trim(),
                type: 'email',
            });
            if (error) throw error;

            setNotice(null);
            setEmailCode('');
            // Full name, username, and phone are all collected together on
            // /setup-profile — the middleware's user_has_complete_profile
            // gate routes a brand-new account there automatically, so this
            // push just needs to land somewhere protected.
            router.push(next || '/dashboard');
        } catch (err: unknown) {
            setFormError(getErrorMessage(err) || 'Invalid or expired code. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

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

            <h1 className={styles.title}>
                {stage === 'email' && 'Create Account'}
                {stage === 'email-code' && 'Confirm Your Email'}
            </h1>
            <p className={styles.subtitle}>
                {stage === 'email' && "Let's get started — we'll email you a code, no password needed."}
                {stage === 'email-code' && `Enter the ${OTP_CODE_LENGTH}-digit code we just sent you.`}
            </p>

            {formError && (
                <div style={{ color: 'var(--color-interface-error)', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', fontSize: '14px', textAlign: 'center', marginBottom: '16px', width: '100%', maxWidth: 360 }}>
                    {formError}
                </div>
            )}

            {notice && !formError && (
                <div style={{ color: 'var(--color-interface-success)', background: 'rgba(34,197,94,0.1)', padding: '12px', borderRadius: '8px', fontSize: '14px', textAlign: 'center', marginBottom: '16px', width: '100%', maxWidth: 360 }}>
                    {notice}
                </div>
            )}

            {stage === 'email' && (
                <form className={styles.form} onSubmit={handleSendEmailCode}>
                    <div className={styles.inputWrapper}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                            className={styles.input}
                            required
                            autoFocus
                        />
                    </div>
                    <button type="submit" className={styles.signInBtn} disabled={isSubmitting} aria-busy={isSubmitting}>
                        {isSubmitting ? 'Sending...' : 'Send Code'}
                    </button>
                </form>
            )}

            {stage === 'email-code' && (
                <form className={styles.form} onSubmit={handleVerifyEmailCode}>
                    <div className={styles.inputWrapper}>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={OTP_CODE_LENGTH}
                            value={emailCode}
                            onChange={(e) => setEmailCode(e.target.value)}
                            placeholder={'0'.repeat(OTP_CODE_LENGTH)}
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
                        onClick={handleResendEmailCode}
                        disabled={isSubmitting || resendCooldown > 0}
                        style={{ alignSelf: 'center' }}
                    >
                        {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
                    </button>
                </form>
            )}

            {stage === 'email' && (
                <>
                    <div className={styles.divider}>Or sign up with</div>

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
                </>
            )}

            <div className={styles.footer}>
                <Link href={`/signup${nextQuery}`} className={`${styles.footerLink} ${styles.activeLink}`}>
                    Create Account
                </Link>
                <Link href={`/login${nextQuery}`} className={styles.footerLink}>
                    Log In
                </Link>
            </div>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button
                    type="button"
                    onClick={() => setIsReportModalOpen(true)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}
                >
                    Trouble signing up?
                </button>
            </div>

            <ReportIssueModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                identifier={email.trim() || undefined}
                subject="Failed signup (web)"
            />
        </div>
    );
}
