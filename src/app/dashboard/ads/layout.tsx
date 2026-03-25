'use client';

/**
 * Advertiser section layout guard.
 *
 * Protects ALL pages under /dashboard/ads/* by checking that the active
 * account has type 'advertiser' or 'hybrid'. If not, redirects to /dashboard
 * so the user can switch to an appropriate account.
 *
 * 'hybrid' accounts are permitted because they may have both organizer and
 * advertiser capabilities assigned.
 */

import React, { useMemo } from 'react';
import { useAccountTypeGuard } from '@/hooks/useAccountTypeGuard';
import type { Account } from '@/context/OrganizationContext';

type AccountType = Account['type'];

export default function AdsLayout({ children }: { children: React.ReactNode }) {
    // Memoized so the array reference is stable across renders and doesn't
    // retrigger the guard's useEffect on every render.
    const allowedTypes = useMemo<AccountType[]>(() => ['advertiser', 'hybrid'], []);
    const { isChecking, isAuthorized } = useAccountTypeGuard(allowedTypes);

    // Render nothing while the account type is being verified to avoid
    // a flash of protected content before the redirect fires.
    if (isChecking) return null;

    // isAuthorized false means the hook has already called router.replace()
    if (!isAuthorized) return null;

    return <>{children}</>;
}
