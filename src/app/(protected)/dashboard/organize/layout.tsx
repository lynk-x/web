'use client';

/**
 * Organizer section layout guard.
 *
 * Protects ALL pages under /dashboard/organize/* by checking that the active
 * account has type 'organizer'. If not, redirects to /dashboard
 * so the user can switch to an appropriate account.
 */

import React from 'react';
import AccountGuard from '@/components/dashboard/AccountGuard';

export default function OrganizeLayout({ children }: { children: React.ReactNode }) {
    return <AccountGuard allowedTypes={['organizer']}>{children}</AccountGuard>;
}
