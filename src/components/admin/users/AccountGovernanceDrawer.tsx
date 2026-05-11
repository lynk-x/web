"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styles from './AccountGovernanceDrawer.module.css';
import { AdminAccount, KycVerification } from '@/types/admin';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/error';
import { formatString } from '@/utils/format';

interface AccountGovernanceDrawerProps {
    account: AdminAccount | null;
    onClose: () => void;
}

export default function AccountGovernanceDrawer({ account, onClose }: AccountGovernanceDrawerProps) {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const [activeTab, setActiveTab] = useState<'wallet' | 'kyc'>('kyc');
    const [isLoading, setIsLoading] = useState(false);
    const [verification, setVerification] = useState<KycVerification | null>(null);
    const [signedUrls, setSignedUrls] = useState<string[]>([]);

    const fetchVerification = useCallback(async () => {
        if (!account) return;
        setIsLoading(true);
        try {
            // Find the latest pending or approved verification for this user
            const { data, error } = await supabase
                .from('identity_verifications')
                .select('*')
                .eq('account_id', account.id) // In this context, User.id might be used as Account ID or we need to find primary account
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            setVerification(data);

            if (data?.uploaded_documents?.length) {
                const { data: urls } = await supabase.storage
                    .from('kyc-documents')
                    .createSignedUrls(data.uploaded_documents, 3600);
                if (urls) setSignedUrls(urls.filter(d => d.signedUrl).map(d => d.signedUrl!));
            }
        } catch (err) {
            console.error('Failed to fetch verification:', err);
        } finally {
            setIsLoading(false);
        }
    }, [account, supabase]);

    useEffect(() => {
        if (account) {
            fetchVerification();
            setActiveTab('kyc');
        }
    }, [account, fetchVerification]);

    const handleModerate = async (status: 'approved' | 'rejected', reason?: string) => {
        if (!verification) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.rpc('moderate_kyc_verification', {
                p_verification_id: verification.id,
                p_status: status,
                p_reason: reason
            });

            if (error) throw error;
            showToast(`Identity verification ${status} successfully.`, 'success');
            fetchVerification();
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!account) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <h2 className={styles.title}>Account Governance</h2>
                        <span style={{ opacity: 0.5, fontSize: '13px' }}>
                            {account.display_name} • {account.reference}
                        </span>
                    </div>
                    <button className={styles.button} style={{ width: 'auto', padding: '6px' }} onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div className={styles.tabs}>
                    <button 
                        className={`${styles.tab} ${activeTab === 'kyc' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('kyc')}
                    >
                        Identity & KYC
                    </button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'wallet' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('wallet')}
                    >
                        Wallet & Finance
                    </button>
                </div>

                <div className={styles.content}>
                    {activeTab === 'kyc' ? (
                        <>
                            <div className={styles.card}>
                                <span className={styles.label}>Verification Status</span>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '8px' }}>
                                    <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-brand-primary)' }}>
                                        {account.kyc_tier ? account.kyc_tier.replace(/_/g, ' ').toUpperCase() : 'NO TIER'}
                                    </span>
                                    <span style={{ fontSize: '12px', opacity: 0.5 }}>
                                        {account.kyc_tier === 'tier_3_advanced' ? 'Maximum Level' : 'Identity Verification'}
                                    </span>
                                </div>
                                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                                    <div style={{ width: '65%', height: '100%', background: 'var(--color-brand-primary)' }}></div>
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', opacity: 0.7 }}>
                                    Identity Documents
                                </h3>
                                <div className={styles.docGallery}>
                                    {signedUrls.map((url, idx) => (
                                        <div key={idx} className={styles.docItem} onClick={() => window.open(url, '_blank')}>
                                            <img src={url} alt={`Doc ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                                        </div>
                                    ))}
                                    {signedUrls.length === 0 && (
                                        <div className={styles.docItem}>
                                            <div style={{ textAlign: 'center' }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.4 }}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L12 15l-4-4-5 5" /></svg>
                                                <p style={{ fontSize: '10px', marginTop: '4px', opacity: 0.5 }}>No Documents</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles.grid}>
                                <div className={styles.card}>
                                    <span className={styles.label}>Total Revenue</span>
                                    <div className={styles.value}>{new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(account.total_revenue)}</div>
                                </div>
                                <div className={styles.card}>
                                    <span className={styles.label}>Account Status</span>
                                    <div className={styles.value} style={{ fontSize: '16px', textTransform: 'uppercase' }}>{account.status.replace(/_/g, ' ')}</div>
                                </div>
                            </div>

                            <div className={styles.card}>
                                <span className={styles.label}>Payout Destination</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                                    <div style={{ width: '32px', height: '32px', background: '#34d399', borderRadius: '4px', display: 'flex', alignItems: 'center', justifySelf: 'center', padding: '4px' }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="black"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '14px', fontWeight: 600 }}>M-Pesa Business</p>
                                        <p style={{ fontSize: '12px', opacity: 0.5 }}>254700****89</p>
                                    </div>
                                    <div style={{ marginLeft: 'auto', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>
                                        VERIFIED
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className={styles.footer}>
                    {activeTab === 'kyc' ? (
                        <>
                            <button 
                                className={`${styles.button} ${styles.buttonPrimary}`}
                                onClick={() => handleModerate('approved')}
                                disabled={isLoading || !verification || verification.status === 'approved'}
                            >
                                Approve Documents
                            </button>
                            <button 
                                className={styles.button}
                                onClick={() => showToast('Update request sent to user', 'info')}
                                disabled={isLoading || !verification}
                            >
                                Request Update
                            </button>
                            <button 
                                className={`${styles.button} ${styles.buttonDanger}`}
                                onClick={() => handleModerate('rejected', 'Documents do not meet quality standards.')}
                                disabled={isLoading || !verification || verification.status === 'rejected'}
                            >
                                Reject
                            </button>
                        </>
                    ) : (
                        <>
                            <button className={`${styles.button} ${styles.buttonPrimary}`}>Initiate Payout</button>
                            <button className={styles.button}>View Full Ledger</button>
                            <button className={`${styles.button} ${styles.buttonDanger}`}>Freeze Wallet</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
