"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import styles from './page.module.css';

export default function UpdatePasswordPage() {
    const router = useRouter();
    const supabase = createClient();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // Confirm there is an active session (which the email link sets)
        // If not, we warn the user, but still allow them to attempt if they just got here.
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setError("Warning: You do not appear to have an active recovery session. Please request a new link if the update fails.");
            }
        });
    }, [supabase]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);

        const { error: updateError } = await supabase.auth.updateUser({
            password: password
        });

        setIsLoading(false);

        if (updateError) {
            setError(updateError.message);
        } else {
            setMessage("Password updated successfully! You can safely close this page and log into the app.");
            setTimeout(() => {
                router.push('/login'); 
            }, 5000);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.appBar}>
                <button 
                    className={styles.iconBtn} 
                    onClick={() => router.back()}
                >
                    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                
                <Image 
                    src="/lynk-x_text.svg" 
                    alt="Lynk-X" 
                    width={200} 
                    height={60} 
                    style={{ objectFit: 'cover' }}
                    priority
                />
            </header>

            <div className={styles.contentWrapper}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Update Password</h1>
                </header>
                
                <p className={styles.description}>
                    Please enter your new password below.
                </p>

                <form className={styles.form} onSubmit={handleUpdate}>
                    <input
                        type="password"
                        placeholder="New Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={styles.input}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={styles.input}
                        required
                    />

                    {error && <p style={{ color: '#ff4444', textAlign: 'center', fontSize: '0.875rem' }}>{error}</p>}
                    {message && <p style={{ color: '#00FF00', textAlign: 'center', fontSize: '1rem', fontWeight: 'bold' }}>{message}</p>}

                    <button type="submit" className={styles.sendBtn} disabled={isLoading}>
                        {isLoading ? 'Updating...' : 'Save Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
