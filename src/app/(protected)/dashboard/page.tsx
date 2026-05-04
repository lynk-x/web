"use client";

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

function DashboardRoot() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, profile, isProfileComplete, isLoading: isLoadingAuth, isLoadingProfile, logout } = useAuth();
    const { accounts: allAccounts, setActiveAccountId, isLoading: isLoadingOrg } = useOrganization();
    const [isRedirecting, setIsRedirecting] = useState(false);

    // ?type=organizer|advertiser — set by the drawer to pre-filter the workspace list
    const typeParam = searchParams.get('type') as 'organizer' | 'advertiser' | null;

    // Non-attendee accounts, optionally filtered by the type the user arrived from
    const businessAccounts = allAccounts.filter(a => a.type !== 'attendee');
    const displayAccounts = typeParam
        ? businessAccounts.filter(a => a.type === typeParam)
        : businessAccounts;

    const handleSelectWorkspace = useCallback((account: any) => {
        setIsRedirecting(true);
        setActiveAccountId(account.id);
        const path = account.type === 'platform'
            ? '/dashboard/admin'
            : account.type === 'advertiser'
                ? '/dashboard/ads'
                : '/dashboard/organize';

        if (!isProfileComplete) {
            router.push(`/setup-profile?next=${encodeURIComponent(path)}&accountRef=${account.id}`);
        } else {
            router.push(path);
        }
    }, [router, setActiveAccountId, isProfileComplete]);

    useEffect(() => {
        if (isLoadingAuth || isLoadingProfile || isLoadingOrg) return;

        if (!user) {
            router.replace('/login');
            return;
        }

        // We no longer auto-redirect to onboarding here. This prevents loops
        // and allows users to see the empty state of the dashboard picker.
        // The user can manually click "Create New Account" if they have no memberships.
    }, [isLoadingAuth, isLoadingProfile, isLoadingOrg, user, router]);


    if (isLoadingAuth || isLoadingProfile || isLoadingOrg || isRedirecting) {
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
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    const typeLabel = typeParam === 'advertiser' ? 'Ad Center' : typeParam === 'organizer' ? 'Organizer' : null;
    const createUrl = typeParam ? `/onboarding?type=${typeParam}` : '/onboarding';

    if (displayAccounts.length > 0) {
        return (
            <div className={styles.container}>
                <div className={styles.onboardingWrapper}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>
                            {typeLabel ? `Your ${typeLabel} Workspaces` : 'Your Workspaces'}
                        </h1>
                        <p className={styles.subtitle}>
                            {typeLabel
                                ? `Select a workspace or create a new ${typeLabel} account.`
                                : 'Select a workspace to continue.'}
                        </p>
                    </div>

                    <div className={styles.workspaceGrid}>
                        {displayAccounts.map((acc) => (
                            <div
                                key={acc.id}
                                className={styles.workspaceCard}
                                onClick={() => handleSelectWorkspace(acc)}
                            >
                                <div className={styles.cardHeader}>
                                    <div className={styles.avatar}>
                                        {acc.logoUrl
                                            ? <img src={acc.logoUrl} alt={acc.name} />
                                            : acc.name.charAt(0)}
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

                        <div
                            className={`${styles.workspaceCard} ${styles.addNewCard}`}
                            onClick={() => router.push(createUrl)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className={styles.plusIcon}>+</div>
                            <span>Create New Workspace</span>
                        </div>
                    </div>
                </div>

                <button className={styles.logoutBtn} onClick={logout} title="Sign Out">
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

export default function DashboardRootPage() {
    return (
        <Suspense fallback={null}>
            <DashboardRoot />
        </Suspense>
    );
}
