"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import styles from './page.module.css';

export default function PlayPage() {
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [flagChecked, setFlagChecked] = useState(false);
    const [isFeatureEnabled, setIsFeatureEnabled] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkFeatureFlag = async () => {
            try {
                const { data, error } = await supabase
                    .from('feature_flags')
                    .select('is_enabled')
                    .eq('key', 'enable_live_quiz')
                    .maybeSingle();
                
                if (error) {
                    console.error("Feature flag error:", error);
                    setIsFeatureEnabled(false);
                } else {
                    setIsFeatureEnabled(data?.is_enabled === true);
                }
            } catch (err) {
                console.error("Failed to check feature flag:", err);
                setIsFeatureEnabled(false);
            } finally {
                setFlagChecked(true);
            }
        };
        checkFeatureFlag();
    }, []);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!pin || pin.length < 5) {
            setError("We didn't recognize that game PIN. Please check and try again.");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('questionnaires')
                .select('id, type')
                .eq('room_code', pin)
                .single();

            if (error || !data) {
                throw new Error("We didn't recognize that game PIN. Please check and try again.");
            }

            // Note: Eventually we can route to a "waiting room" if we implement websockets.
            // For now, this takes them directly into the quiz client.
            router.push(`/quiz/${data.id}?pin=${pin}`);

        } catch (err: any) {
            setError(err.message);
            setLoading(false); // Reset loading only on error, so button doesn't flash if successful
        }
    }

    if (!flagChecked) {
        return (
            <div className={styles.container}>
                <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                    <div style={{ width: 180, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ width: 260, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ width: 120, height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
            </div>
        );
    }

    if (!isFeatureEnabled) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <h1 style={{ fontWeight: 900, marginBottom: '16px' }}>Feature Disabled</h1>
                    <p style={{ opacity: 0.6 }}>Live quizzes are currently disabled by the administrator. Please check back later!</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.logoImgWrapper}>
                    <Image src="/lynk-x_combined_logo.svg" alt="Lynk-X" width={220} height={100} priority />
                </div>
                <div className={styles.logo}>Lynk-X <span>Live!</span></div>
                
                <form onSubmit={handleJoin} className={styles.form}>
                    <input
                        className={styles.input}
                        type="text"
                        maxLength={10}
                        placeholder="Game PIN"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)} // Allow alphanumeric PINs
                        required
                    />
                    {error && <div className={styles.error}>{error}</div>}
                    <button
                        type="submit"
                        className={styles.button}
                        disabled={loading}
                    >
                        {loading ? 'Joining...' : 'Enter'}
                    </button>
                </form>
            </div>
            <div className={styles.footer}>
                Powered by Lynk-X
            </div>
        </div>
    );
}
