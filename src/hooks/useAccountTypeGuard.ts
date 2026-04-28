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
 * Profile completeness is checked via AuthContext's `isProfileComplete` flag
 * (single source of truth — no duplicated logic).
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
    const { accounts, activeAccount, isLoading: isOrgLoading } = useOrganization();
    const { isProfileComplete, isLoading: isAuthLoading } = useAuth();
    
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // Wait for both contexts to finish loading.
        if (isOrgLoading || isAuthLoading) return;

        // 1. Check whether the user owns any account of the required type at all.
        const matchingAccounts = accounts.filter(a => allowedTypes.includes(a.type as AccountType));
        const hasMatchingAccount = matchingAccounts.length > 0;

        if (!hasMatchingAccount) {
            // User has NO account of this type — send to onboarding to create one.
            const defaultType = allowedTypes.includes('advertiser') ? 'advertiser' : 'organizer';
            router.replace(`/onboarding?type=${defaultType}`);
            setIsAuthorized(false);
            setIsChecking(false);
            return;
        }

        // 2. Check profile completeness (single source of truth from AuthContext)
        if (!isProfileComplete) {
            const type = allowedTypes.includes('advertiser') ? 'ads' : 'organize';
            router.replace(`/setup-profile?type=${type}`);
            setIsAuthorized(false);
            setIsChecking(false);
            return;
        }

        // 3. Case: active account is the correct type
        if (activeAccount && allowedTypes.includes(activeAccount.type as AccountType)) {
            setIsAuthorized(true);
            setIsChecking(false);
            return;
        }

        // 4. Case: wrong account type is active, but they DO have a matching one
        // User has matching accounts, force them to pick one from the picker.
        const defaultType = allowedTypes.includes('advertiser') ? 'advertiser' : 'organizer';
        router.replace(`/dashboard?type=${defaultType}`);

        setIsAuthorized(false);
        setIsChecking(false);
    }, [isOrgLoading, isAuthLoading, accounts, activeAccount, allowedTypes, router, isProfileComplete]);

    return { isChecking, isAuthorized };
}
