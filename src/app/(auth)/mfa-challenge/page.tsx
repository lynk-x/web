'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from '../login/page.module.css';

export default function MfaChallengePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get('next') || '/dashboard';
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [factorId, setFactorId] = useState<string | null>(null);

    useEffect(() => {
        // Find the verified TOTP factor ID on load
        supabase.auth.mfa.listFactors().then(({ data, error }) => {
            if (error) {
                setError('Failed to load authentication factors.');
                return;
            }
            const totpFactor = data.totp.find(f => f.status === 'verified');
            if (totpFactor) {
                setFactorId(totpFactor.id);
            } else {
                setError('No verified Two-Factor Authentication method found.');
            }
        });
    }, [supabase.auth.mfa]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!factorId) return;

        setError(null);
        setIsLoading(true);

        try {
            // 1. Create a challenge
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
            if (challengeError) throw challengeError;

            // 2. Verify the challenge with the entered code
            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code: code.trim()
            });

            if (verifyError) {
                setError('Invalid authentication code. Please try again.');
                setIsLoading(false);
                return;
            }

            // Successfully elevated to aal2!
            router.push(next);
            router.refresh();

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
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

            <h1 className={styles.title}>Two-Factor Authentication</h1>
            <p className={styles.subtitle}>
                Your account is protected by MFA. Please open your authenticator app and enter the 6-digit code.
            </p>

            <form className={styles.form} onSubmit={handleSubmit}>
                {error && (
                    <div style={{ color: 'var(--color-interface-error)', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
                        {error}
                    </div>
                )}

                <div className={styles.inputWrapper}>
                    <input
                        type="text"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="000000"
                        className={styles.input}
                        required
                        style={{ fontFamily: 'monospace', letterSpacing: '4px', textAlign: 'center', fontSize: '20px' }}
                    />
                </div>

                <button type="submit" className={styles.signInBtn} disabled={isLoading || !factorId}>
                    {isLoading ? 'Verifying...' : 'Verify Code'}
                </button>
            </form>
        </div>
    );
}
