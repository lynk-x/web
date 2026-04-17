"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';
import Link from 'next/link';

/**
 * Dashboard Root Page
 * 
 * Handles workspace selection for returning users or redirection 
 * to onboarding for new users.
 */
export default function DashboardRootPage() {
    const router = useRouter();
    const { user, profile, isLoading: isLoadingAuth, logout } = useAuth();
    const { accounts: allAccounts, activeAccount, setActiveAccountId, isLoading: isLoadingOrg } = useOrganization();
    const [isRedirecting, setIsRedirecting] = useState(false);

    // Attendee accounts are consumer-facing and have no dashboard workspace.
    // Only organizer / advertiser / platform accounts are shown here.
    const accounts = allAccounts.filter(a => a.type !== 'attendee');

    const handleSelectWorkspace = useCallback((account: any) => {
        setIsRedirecting(true);
        setActiveAccountId(account.id);

        const path = account.type === 'platform'
            ? '/dashboard/admin'
            : account.type === 'advertiser'
                ? '/dashboard/ads'
                : '/dashboard/organize';

        router.push(path);
    }, [router, setActiveAccountId]);

    useEffect(() => {
        if (isLoadingAuth || isLoadingOrg) return;

        if (!user) {
            router.replace('/login');
            return;
        }

        if (user && profile && (!profile.full_name || profile.full_name.trim() === '')) {
            router.replace('/dashboard/setup-profile');
            return;
        }

        // 2. Identify and route to the correct dashboard workspace.
        
        // Only redirect to onboarding if we're sure the context has settled:
        // allAccounts is loaded and there are truly no non-attendee workspaces.
        if (allAccounts.length === 0) {
            router.replace('/onboarding');
            return;
        }

        // If the user only has attendee accounts (no organizer/advertiser), go to onboarding.
        if (accounts.length === 0 && allAccounts.length > 0) {
            router.replace('/onboarding');
            return;
        }

        // Single-account auto-redirect is intentionally removed:
        // Even with one workspace, the picker must remain accessible so the user can
        // create a second account of a different type (e.g. add an ads workspace).
    }, [allAccounts, accounts, isLoadingAuth, isLoadingOrg, user, profile, router]);

    if (isLoadingAuth || isLoadingOrg || isRedirecting) {
        return (
            <div className={styles.container}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div className={styles.spinner} style={{
                        width: '32px',
                        height: '32px',
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        borderTopColor: 'var(--color-brand-primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px' }}>
                        {isRedirecting ? 'Launching workspace...' : 'Loading your workspaces...'}
                    </span>
                </div>
                <style jsx>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (accounts.length > 0) {
        return (
            <div className={styles.container}>
                <div className={styles.onboardingWrapper}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Welcome back, {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}</h1>
                        <p className={styles.subtitle}>Choose a workspace to continue your progress.</p>
                    </div>

                    <div className={styles.workspaceGrid}>
                        {accounts.map((acc) => (
                            <div
                                key={acc.id}
                                className={styles.workspaceCard}
                                onClick={() => handleSelectWorkspace(acc)}
                            >
                                <div className={styles.cardHeader}>
                                    <div className={styles.avatar}>
                                        {acc.logoUrl ? (
                                            <img src={acc.logoUrl} alt={acc.name} />
                                        ) : (
                                            acc.name.charAt(0)
                                        )}
                                    </div>
                                    <div className={styles.orgInfo}>
                                        <h3 className={styles.orgName}>{acc.name}</h3>
                                        <span className={styles.orgType}>{acc.type}</span>
                                    </div>
                                </div>

                                <div className={styles.cardFooter}>
                                    <div className={styles.typeIcon} style={{
                                        color: acc.type === 'advertiser' ? 'var(--color-brand-secondary)' : 'var(--color-brand-primary)',
                                        background: acc.type === 'advertiser' ? 'rgba(249, 201, 32, 0.1)' : 'rgba(32, 249, 40, 0.1)'
                                    }}>
                                        {acc.type === 'advertiser' ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        )}
                                    </div>
                                    <button className={styles.openBtn}>Open Workspace</button>
                                </div>
                            </div>
                        ))}

                        <Link href="/onboarding?create=true" className={`${styles.workspaceCard} ${styles.addNewCard}`}>
                            <div className={styles.plusIcon}>+</div>
                            <span>Create New Workspace</span>
                        </Link>
                    </div>
                </div>

                {/* Floating Logout Button */}
                <button 
                    className={styles.logoutBtn} 
                    onClick={logout}
                    title="Sign Out"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span>Logout</span>
                </button>
            </div>
        );
    }

    return null;
}
