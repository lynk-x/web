"use client";

import React, { useMemo } from 'react';
import { useAccountTypeGuard } from '@/hooks/useAccountTypeGuard';
import type { Account } from '@/context/OrganizationContext';

type AccountType = Account['type'];

interface AccountGuardProps {
    allowedTypes: AccountType[];
    children: React.ReactNode;
}

export default function AccountGuard({ allowedTypes, children }: AccountGuardProps) {
    // Memoize the allowedTypes array so its reference is stable across renders
    const types = useMemo<AccountType[]>(() => allowedTypes, [allowedTypes]);
    const { isChecking, isAuthorized } = useAccountTypeGuard(types);

    // Render nothing while the account type is being verified to avoid
    // a flash of protected content before the redirect fires.
    if (isChecking) return null;

    // isAuthorized false means the hook has already called router.replace()
    if (!isAuthorized) return null;

    return <>{children}</>;
}
