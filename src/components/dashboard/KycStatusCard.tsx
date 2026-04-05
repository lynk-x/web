"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from './KycStatusCard.module.css';

interface KycStatusCardProps {
    accountId: string;
}

type KycStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'suspended' | 'expired';

export default function KycStatusCard({ accountId }: KycStatusCardProps) {
    const supabase = createClient();
    const [status, setStatus] = useState<KycStatus | 'none'>('none');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            const { data, error } = await supabase
                .from('identity_verifications')
                .select('status')
                .eq('account_id', accountId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                setStatus(data.status as KycStatus);
            }
            setIsLoading(false);
        };

        fetchStatus();
    }, [accountId, supabase]);

    if (isLoading) return <div className={styles.skeleton} />;

    const getStatusTheme = () => {
        switch (status) {
            case 'approved': return { color: '#20F928', bg: 'rgba(32, 249, 40, 0.1)', text: 'Verified' };
            case 'rejected': return { color: '#FF5252', bg: 'rgba(255, 82, 82, 0.1)', text: 'Rejected' };
            case 'submitted': return { color: '#F9C920', bg: 'rgba(249, 201, 32, 0.1)', text: 'Pending Review' };
            case 'none': 
            case 'pending':
            default: return { color: 'rgba(255, 255, 255, 0.4)', bg: 'rgba(255, 255, 255, 0.05)', text: 'Not Verified' };
        }
    };

    const { color, bg, text } = getStatusTheme();

    return (
        <div className={styles.card}>
            <div className={styles.info}>
                <h3 className={styles.title}>Identity Verification</h3>
                <p className={styles.desc}>
                    Verified accounts can sell tickets, run high-budget ads, and access faster payouts.
                </p>
            </div>
            <div className={styles.statusBadge} style={{ color, background: bg }}>
                <div className={styles.dot} style={{ background: color }} />
                {text}
            </div>
            {(status === 'none' || status === 'rejected') && (
                <button className={styles.verifyBtn} onClick={() => window.location.href = '/onboarding'}>
                    {status === 'rejected' ? 'Re-verify' : 'Verify Now'}
                </button>
            )}
        </div>
    );
}
