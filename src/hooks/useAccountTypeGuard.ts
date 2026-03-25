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
 * A 'hybrid' account is allowed through any section.
 *
 * Usage:
 *   const { isAuthorized, isChecking } = useAccountTypeGuard(['organizer', 'hybrid'])
 *
 * Render nothing while isChecking is true to avoid flash-of-content.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/context/OrganizationContext';
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
 *                      e.g. ['organizer', 'hybrid'] or ['advertiser', 'hybrid']
 */
export function useAccountTypeGuard(allowedTypes: AccountType[]): GuardResult {
    const router = useRouter();
    const { accounts, activeAccount, isLoading } = useOrganization();
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // Wait for the organization context to finish loading.
        if (isLoading) return;

        // ── Case: active account is the correct type ───────────────────────
        if (activeAccount && allowedTypes.includes(activeAccount.type)) {
            setIsAuthorized(true);
            setIsChecking(false);
            return;
        }

        // ── Case: wrong account type ───────────────────────────────────────
        // Check whether the user owns any account of the required type at all.
        const hasMatchingAccount = accounts.some(a => allowedTypes.includes(a.type));

        if (hasMatchingAccount) {
            // User has an account of the right type but a different one is active.
            // Go to the workspace picker so they can switch.
            router.replace('/dashboard');
        } else {
            // User has NO account of this type — send to onboarding to create one.
            // e.g. an organizer clicking "Ads Dashboard" from the homepage drawer.
            router.replace('/onboarding');
        }

        setIsAuthorized(false);
        setIsChecking(false);
    }, [isLoading, accounts, activeAccount, allowedTypes, router]);

    return { isChecking, isAuthorized };
}
