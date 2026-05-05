"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import styles from './OrganizationSwitcher.module.css';

const OrganizationSwitcher = ({ pos = 'top' }: { pos?: 'top' | 'bottom' }) => {
    const { accounts, activeAccount, setActiveAccountId, isLoading } = useOrganization();
    const { user, profile, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const displayEmail = profile?.email || user?.email || '';

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (isLoading) {
        return <div className={styles.loadingState}>Loading Account...</div>;
    }

    // If they have no accounts, the onboarding layout will handle them, but fail gracefully here
    if (!activeAccount) {
        return null;
    }

    return (
        <div className={styles.container} ref={dropdownRef}>
            <button
                className={styles.trigger}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <div className={styles.activeAccountInfo}>
                    <div className={styles.avatar}>
                        {activeAccount.logoUrl ? (
                            <img src={activeAccount.logoUrl} alt={activeAccount.name} />
                        ) : (
                            <div className={styles.avatarFallback}>{activeAccount.name.charAt(0)}</div>
                        )}
                    </div>
                    <div className={styles.textContainer}>
                        <span className={styles.accountName}>{activeAccount.name}</span>
                        <span className={styles.accountRole}>{activeAccount.role}</span>
                    </div>
                </div>
                <svg className={`${styles.chevron} ${isOpen ? styles.open : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>

            {isOpen && (
                <div 
                    className={styles.dropdown} 
                    style={pos === 'bottom' ? { bottom: 'calc(100% + 8px)', top: 'auto' } : {}}
                >
                    <div className={styles.dropdownHeader}>Switch Organization</div>
                    <div className={styles.accountList}>
                        {/* Business Accounts Section */}
                        {accounts.filter(a => a.type !== 'attendee').map((account) => (
                            <button
                                key={account.id}
                                className={`${styles.accountItem} ${account.id === activeAccount.id ? styles.selected : ''}`}
                                onClick={() => {
                                    setActiveAccountId(account.id);
                                    setIsOpen(false);
                                }}
                            >
                                <div className={styles.avatarSmall}>
                                    {account.logoUrl ? (
                                        <img src={account.logoUrl} alt={account.name} />
                                    ) : (
                                        <div className={styles.avatarFallback}>{account.name.charAt(0)}</div>
                                    )}
                                </div>
                                <div className={styles.textContainer}>
                                    <span className={styles.accountName}>{account.name}</span>
                                    {account.id === activeAccount.id && (
                                        <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    )}
                                </div>
                            </button>
                        ))}

                        {/* Personal Account Section */}
                        {accounts.some(a => a.type === 'attendee') && (
                            <>
                                <div className={styles.divider} />
                                <div className={styles.sectionHeader}>Personal</div>
                                {accounts.filter(a => a.type === 'attendee').map((account) => (
                                    <button
                                        key={account.id}
                                        className={`${styles.accountItem} ${account.id === activeAccount.id ? styles.selected : ''}`}
                                        onClick={() => {
                                            setIsOpen(false);
                                            router.push('/'); // Redirect to main app
                                        }}
                                    >
                                        <div className={styles.avatarSmall}>
                                            <div className={styles.avatarFallback} style={{ color: '#aaa' }}>
                                                {user?.email?.charAt(0).toUpperCase() || 'P'}
                                            </div>
                                        </div>
                                        <div className={styles.textContainer}>
                                            <span className={styles.accountName}>Personal Profile</span>
                                            <span className={styles.accountRole}>Switch to App</span>
                                        </div>
                                        <svg className={styles.checkIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.4 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                    <div className={styles.dropdownFooter}>
                        <button
                            className={styles.createBtn}
                            onClick={() => {
                                setIsOpen(false);
                                router.push('/onboarding');
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Create New Organization
                        </button>
                    </div>
                    {displayEmail && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '4px', paddingTop: '4px' }}>
                            <div style={{ padding: '8px 12px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Logged in as: {displayEmail}
                            </div>
                            <div className={styles.dropdownFooter} style={{ borderTop: 'none', marginTop: 0 }}>
                                <button
                                    className={styles.createBtn}
                                    style={{ color: '#ff4d4d' }}
                                    onClick={logout}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OrganizationSwitcher;
