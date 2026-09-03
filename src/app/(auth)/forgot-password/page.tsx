'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import { resetPassword } from '../login/actions';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const serverError = searchParams.get('error');
    const serverMessage = searchParams.get('message');

    const [formError, setFormError] = useState<string | null>(serverError || null);
    const [formMessage, setFormMessage] = useState<string | null>(serverMessage || null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError(null);
        setFormMessage(null);
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);

        try {
            const res = await resetPassword(formData);
            if (res.error) {
                setFormError(res.error);
                setIsSubmitting(false);
            } else if (res.redirectTo) {
                router.push(res.redirectTo);
            }
        } catch (err: any) {
            setFormError(err?.message || 'Failed to send reset email.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/login" className={styles.backButton}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 12H5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 19L5 12L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Link>
                <h1 className={styles.title}>Forgot Password</h1>
            </header>

            <div className={styles.contentWrapper}>
                <p className={styles.description}>
                    We will send you an email with a link to reset your password, please enter the email associated with your account below.
                </p>

                {formError && <p style={{ color: 'var(--color-interface-error)', textAlign: 'center', marginBottom: '16px' }}>{formError}</p>}
                {formMessage && <p style={{ color: 'var(--color-interface-success)', textAlign: 'center', marginBottom: '16px' }}>{formMessage}</p>}

                <form className={styles.form} onSubmit={handleSubmit}>
                    <input
                        name="email"
                        type="email"
                        placeholder="Enter your email..."
                        className={styles.input}
                        required
                    />

                    <button className={styles.sendBtn} type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Sending...' : 'Send Link'}
                    </button>
                </form>
            </div>
        </div>
    );
}
