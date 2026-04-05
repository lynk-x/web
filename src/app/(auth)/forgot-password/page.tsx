'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import { resetPassword } from '../login/actions';

export default function ForgotPasswordPage() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');
    const message = searchParams.get('message');

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

                {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '16px' }}>{error}</p>}
                {message && <p style={{ color: '#00FF00', textAlign: 'center', marginBottom: '16px' }}>{message}</p>}

                <form className={styles.form} action={resetPassword}>
                    <input
                        name="email"
                        type="email"
                        placeholder="Enter your email..."
                        className={styles.input}
                        required
                    />

                    <button className={styles.sendBtn} type="submit">Send Link</button>
                </form>
            </div>
        </div>
    );
}
