'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../login/page.module.css';
import { processAccountRecovery } from './actions';

export default function RecoverAccountPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const result = await processAccountRecovery(email, recoveryCode);
            if (result.error) {
                setError(result.error);
                setIsLoading(false);
            } else if (result.url) {
                // Instantly redirects them to the authenticated recovery URL
                router.push(result.url);
            }
        } catch (err: any) {
            setError('An unexpected error occurred. Please try again.');
            setIsLoading(false);
        }
    };

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

            <h1 className={styles.title}>Account Recovery</h1>
            <p className={styles.subtitle}>
                Enter your email address and your 16-character cryptographic recovery code to restore access.
            </p>

            <form className={styles.form} onSubmit={handleSubmit}>
                {error && (
                    <div style={{ color: 'var(--color-interface-error)', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
                        {error}
                    </div>
                )}

                <div className={styles.inputWrapper}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address"
                        className={styles.input}
                        required
                    />
                </div>

                <div className={styles.inputWrapper}>
                    <input
                        type="text"
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value)}
                        placeholder="16-Character Recovery Code"
                        className={styles.input}
                        required
                        style={{ fontFamily: 'monospace', letterSpacing: '1px' }}
                    />
                </div>

                <button type="submit" className={styles.signInBtn} disabled={isLoading}>
                    {isLoading ? 'Verifying Cryptographic Proof...' : 'Recover Account'}
                </button>
            </form>

            <div className={styles.forgotPassword} style={{ marginTop: '24px' }}>
                <Link href="/login" className={styles.forgotPasswordLink}>
                    &larr; Back to Login
                </Link>
            </div>
        </div>
    );
}
