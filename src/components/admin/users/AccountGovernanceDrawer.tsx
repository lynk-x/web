"use client";

import React, { useState } from 'react';
import styles from './AccountGovernanceDrawer.module.css';
import { User } from '@/types/admin';

interface AccountGovernanceDrawerProps {
    account: User | null;
    onClose: () => void;
}

export default function AccountGovernanceDrawer({ account, onClose }: AccountGovernanceDrawerProps) {
    const [activeTab, setActiveTab] = useState<'wallet' | 'kyc'>('kyc');

    if (!account) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <h2 className={styles.title}>Account Governance</h2>
                        <span style={{ opacity: 0.5, fontSize: '13px' }}>
                            {account.name} • #{account.id.slice(0, 8).toUpperCase()}
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
                                        {account.kycTier || 'Tier 1'}
                                    </span>
                                    <span style={{ fontSize: '12px', opacity: 0.5 }}>Level 2 access pending</span>
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
                                    <div className={styles.docItem}>
                                        <div style={{ textAlign: 'center' }}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.4 }}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L12 15l-4-4-5 5" /></svg>
                                            <p style={{ fontSize: '10px', marginTop: '4px', opacity: 0.5 }}>ID Front</p>
                                        </div>
                                    </div>
                                    <div className={styles.docItem}>
                                        <div style={{ textAlign: 'center' }}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.4 }}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L12 15l-4-4-5 5" /></svg>
                                            <p style={{ fontSize: '10px', marginTop: '4px', opacity: 0.5 }}>ID Back</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles.grid}>
                                <div className={styles.card}>
                                    <span className={styles.label}>Available</span>
                                    <div className={styles.value}>KES 124,500</div>
                                </div>
                                <div className={styles.card}>
                                    <span className={styles.label}>Escrow</span>
                                    <div className={styles.value} style={{ opacity: 0.5 }}>KES 42,000</div>
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
                            <button className={`${styles.button} ${styles.buttonPrimary}`}>Approve Documents</button>
                            <button className={styles.button}>Request Update</button>
                            <button className={`${styles.button} ${styles.buttonDanger}`}>Reject</button>
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
