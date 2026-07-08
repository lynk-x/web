"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from './KycStatusCard.module.css';

interface KycStatusCardProps {
    accountId: string;
}

type KycStatus =
    | 'pending'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'flagged'
    | 'appealed'
    | 'expired'
    | 'archived';

export default function KycStatusCard({ accountId }: KycStatusCardProps) {
    const supabase = createClient();
    const [status, setStatus] = useState<KycStatus | 'none'>('none');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            const { data, error } = await supabase
                .schema('api')
                .from('v1_identity_verifications')
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
            case 'flagged': return { color: '#FF5252', bg: 'rgba(255, 82, 82, 0.1)', text: 'Flagged' };
            case 'expired': return { color: '#FF5252', bg: 'rgba(255, 82, 82, 0.1)', text: 'Expired' };
            case 'archived': return { color: 'rgba(255, 255, 255, 0.4)', bg: 'rgba(255, 255, 255, 0.05)', text: 'Archived' };
            case 'pending': return { color: '#F9C920', bg: 'rgba(249, 201, 32, 0.1)', text: 'Pending Review' };
            case 'under_review': return { color: '#F9C920', bg: 'rgba(249, 201, 32, 0.1)', text: 'Under Review' };
            case 'appealed': return { color: '#F9C920', bg: 'rgba(249, 201, 32, 0.1)', text: 'Appeal Pending' };
            default: return { color: 'rgba(255, 255, 255, 0.4)', bg: 'rgba(255, 255, 255, 0.05)', text: 'Not Verified' };
        }
    };

    const { color, bg, text } = getStatusTheme();
    const canReverify = status === 'none' || status === 'rejected' || status === 'expired';

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
            {canReverify && (
                <button className={styles.verifyBtn} onClick={() => window.location.href = '/verify'}>
                    {status === 'none' ? 'Verify Now' : 'Re-verify'}
                </button>
            )}
        </div>
    );
}
