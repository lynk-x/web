'use client';

/**
 * Pulse section layout guard.
 *
 * Protects ALL pages under /dashboard/pulse/* by checking that the active
 * account has type 'pulse_user'. If not, redirects to /dashboard
 * so the user can switch to an appropriate account.
 */

import React from 'react';
import AccountGuard from '@/components/dashboard/AccountGuard';

export default function PulseLayout({ children }: { children: React.ReactNode }) {
    return <AccountGuard allowedTypes={['pulse_user']}>{children}</AccountGuard>;
}
