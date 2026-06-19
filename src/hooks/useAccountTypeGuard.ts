/**
 * useAccountTypeGuard
 *
 * Redirects the user away from a dashboard section if their active account
 * does not have the required type or role. Distinguishes between two unauthorized states:
 *
 *  A) User has NO account of the required type + role at all
 *     → redirect to /onboarding so they can create one.
 *
 *  B) User has a valid account, but a different one is currently active
 *     → redirect to /dashboard so they can switch to the right workspace.
 *
 * Profile completeness is checked via AuthContext's `isProfileComplete` flag
 * (single source of truth — no duplicated logic).
 *
 * Usage:
 *   const { isAuthorized, isChecking } = useAccountTypeGuard(['organizer'], ['owner', 'member'])
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
 * @param allowedRoles  Optional list of role slugs permitted to view this section.
 */
export function useAccountTypeGuard(allowedTypes: AccountType[], allowedRoles?: string[]): GuardResult {
    const router = useRouter();
    const { accounts, activeAccount, isLoading: isOrgLoading } = useOrganization();
    const { isProfileComplete, isLoading: isAuthLoading } = useAuth();
    
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    // Serialize allowedRoles to avoid dependency reference changes triggering useEffect loops
    const rolesSerialized = allowedRoles ? allowedRoles.join(',') : '';

    useEffect(() => {
        // Wait for both contexts to finish loading.
        if (isOrgLoading || isAuthLoading) return;

        // Convert serialized roles back to array
        const roles = rolesSerialized ? rolesSerialized.split(',') : undefined;

        // 1. Check whether the user owns any account of the required type and role.
        // Platform accounts are "wildcards" that can access sections unless restricted by role.
        const matchingAccounts = accounts.filter(a => {
            const hasCorrectType = allowedTypes.includes(a.type as AccountType) || a.type === 'platform' || a.type === 'system';
            const hasCorrectRole = !roles || roles.includes(a.role);
            return hasCorrectType && hasCorrectRole;
        });
        const hasMatchingAccount = matchingAccounts.length > 0;

        if (!hasMatchingAccount) {
            // User has NO matching account — send to dashboard picker
            // where they can see the 'No Workspaces Found' state and choose to onboard.
            router.replace('/dashboard');
            setIsAuthorized(false);
            setIsChecking(false);
            return;
        }

        // 2. Check profile completeness (single source of truth from AuthContext)
        if (!isProfileComplete) {
            router.replace('/setup-profile');
            setIsAuthorized(false);
            setIsChecking(false);
            return;
        }

        // 3. Case: active account is the correct type and has correct role
        const isActiveTypeAllowed = activeAccount && (
            allowedTypes.includes(activeAccount.type as AccountType) || 
            activeAccount.type === 'platform' || 
            activeAccount.type === 'system'
        );
        const isActiveRoleAllowed = activeAccount && (!roles || roles.includes(activeAccount.role));

        if (activeAccount && isActiveTypeAllowed && isActiveRoleAllowed) {
            setIsAuthorized(true);
            setIsChecking(false);
            return;
        }

        // 4. Case: wrong account type or role is active, but they DO have a matching one
        // User has matching accounts, force them to pick one from the picker.
        const defaultType = allowedTypes.includes('advertiser') ? 'advertiser' : 'organizer';
        router.replace(`/dashboard?type=${defaultType}`);

        setIsAuthorized(false);
        setIsChecking(false);
    }, [isOrgLoading, isAuthLoading, accounts, activeAccount, allowedTypes, router, isProfileComplete, rolesSerialized]);

    return { isChecking, isAuthorized };
}
