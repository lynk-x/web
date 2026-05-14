'use client';

/**
 * Advertiser section layout guard.
 *
 * Protects ALL pages under /dashboard/ads/* by checking that the active
 * account has type 'advertiser'. If not, redirects to /dashboard
 * so the user can switch to an appropriate account.
 */

import React from 'react';
import AccountGuard from '@/components/dashboard/AccountGuard';

export default function AdsLayout({ children }: { children: React.ReactNode }) {
    return <AccountGuard allowedTypes={['advertiser']}>{children}</AccountGuard>;
}
