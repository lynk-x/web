"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/context/OrganizationContext';
import styles from './OrganizationSwitcher.module.css';

const OrganizationSwitcher = () => {
    const { accounts, activeAccount, setActiveAccountId, isLoading } = useOrganization();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

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
                        {activeAccount.thumbnailUrl ? (
                            <img src={activeAccount.thumbnailUrl} alt={activeAccount.name} />
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
                <div className={styles.dropdown}>
                    <div className={styles.dropdownHeader}>Switch Organization</div>
                    <div className={styles.accountList}>
                        {accounts.map((account) => (
                            <button
                                key={account.id}
                                className={`${styles.accountItem} ${account.id === activeAccount.id ? styles.selected : ''}`}
                                onClick={() => {
                                    setActiveAccountId(account.id);
                                    setIsOpen(false);
                                    // Optional: You might want to refresh the current page data here, 
                                    // but since it's all driven by Context now, components should auto-update.
                                }}
                            >
                                <div className={styles.avatarSmall}>
                                    {account.thumbnailUrl ? (
                                        <img src={account.thumbnailUrl} alt={account.name} />
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
                    </div>
                    <div className={styles.dropdownFooter}>
                        <button
                            className={styles.createBtn}
                            onClick={() => {
                                setIsOpen(false);
                                router.push('/dashboard/onboarding'); // Route we will build next
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Create New Organization
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizationSwitcher;
