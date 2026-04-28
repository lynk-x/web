/**
 * useAccountTypeGuard
 *
 * Redirects the user away from a dashboard section if their active account
 * does not have the required type. Distinguishes between two unauthorized states:
 *
 *  A) User has NO account of the required type at all
 *     → redirect to /onboarding so they can create one.
 *
 *  B) User has an account of the required type, but a different one is currently active
 *     → redirect to /dashboard so they can switch to the right workspace.
 *

 * Usage:
 *   const { isAuthorized, isChecking } = useAccountTypeGuard(['organizer'])
 *
 * Render nothing while isChecking is true to avoid flash-of-content.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import type { Account } from '@/context/OrganizationContext';

type AccountType = Account['type'];

interface GuardResult {
    /** True while the auth + account context is still loading. */
    isChecking: boolean;
    /** True if the active account is permitted for this section. */
    isAuthorized: boolean;
}

/**
 * @param allowedTypes  Account types permitted to view this section.
 *                      e.g. ['organizer'] or ['advertiser']
 */
export function useAccountTypeGuard(allowedTypes: AccountType[]): GuardResult {
    const router = useRouter();
    const { accounts, activeAccount, setActiveAccountId, isLoading: isOrgLoading } = useOrganization();
    const { profile, isLoading: isAuthLoading } = useAuth();
    
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // Wait for both contexts to finish loading.
        if (isOrgLoading || isAuthLoading) return;

        // Debugging for production guard issues
        console.log('[AccountTypeGuard] Checking access:', {
            activeAccount: activeAccount?.id,
            activeType: activeAccount?.type,
            allowedTypes,
            totalAccounts: accounts.length,
            hasProfile: !!profile?.full_name
        });

        // 1. Check whether the user owns any account of the required type at all.
        const matchingAccounts = accounts.filter(a => allowedTypes.includes(a.type as AccountType));
        const hasMatchingAccount = matchingAccounts.length > 0;

        if (!hasMatchingAccount) {
            // User has NO account of this type — send to onboarding to create one.
            console.log('[AccountTypeGuard] No matching accounts found. Redirecting to onboarding.');
            router.replace('/onboarding');
            setIsAuthorized(false);
            setIsChecking(false);
            return;
        }

        // 2. Check profile completeness
        if (!profile || !profile.full_name || profile.full_name.trim() === '') {
            console.log('[AccountTypeGuard] Profile incomplete. Redirecting to setup-profile.');
            const type = allowedTypes.includes('advertiser') ? 'ads' : 'organize';
            router.replace(`/dashboard/setup-profile?type=${type}`);
            setIsAuthorized(false);
            setIsChecking(false);
            return;
        }

        // 3. Case: active account is the correct type
        if (activeAccount && allowedTypes.includes(activeAccount.type as AccountType)) {
            console.log('[AccountTypeGuard] Authorized');
            setIsAuthorized(true);
            setIsChecking(false);
            return;
        }

        // 4. Case: wrong account type is active, but they DO have a matching one
        if (matchingAccounts.length === 1) {
            console.log('[AccountTypeGuard] Switching active account to the only matching one.');
            setActiveAccountId(matchingAccounts[0].id);
            // The context will update, causing a re-render and re-evaluating the active account
            return;
        } else {
            // User has multiple matching accounts, force them to pick one.
            console.log('[AccountTypeGuard] Multiple matching accounts exist. Redirecting to picker.');
            router.replace('/dashboard');
        }

        setIsAuthorized(false);
        setIsChecking(false);
    }, [isOrgLoading, isAuthLoading, accounts, activeAccount, allowedTypes, router, setActiveAccountId, profile]);

    return { isChecking, isAuthorized };
}
