'use client';

/**
 * Admin section layout guard.
 *
 * Protects ALL pages under /dashboard/admin/* by checking that the active
 * account has type 'platform'. If not, redirects to /dashboard
 * so the user can switch to an appropriate account.
 *
 * This is a client-side defense-in-depth layer. The proxy (src/proxy.ts) also
 * performs a server-side user_type check on /dashboard/admin/* routes.
 */

import React from 'react';
import AccountGuard from '@/components/dashboard/AccountGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AccountGuard allowedTypes={['platform']}>{children}</AccountGuard>;
}
