'use client';

/**
 * System Admin Layout Guard
 * 
 * Protects ALL pages under /dashboard/system/* by enforcing two constraints:
 *   1. Active account type must be 'platform'.
 *   2. The user's membership scope must have allowed_country_code as NULL/undefined
 *      (indicating Global Admin authorization).
 * 
 * If a local or restricted admin attempts to access /dashboard/system/*,
 * they are automatically redirected back to the country-specific /dashboard/admin.
 */

import React from 'react';
import AccountGuard from '@/components/dashboard/AccountGuard';
import { useOrganization } from '@/context/OrganizationContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SystemAdminLayout({ children }: { children: React.ReactNode }) {
    const { activeAccount, isLoading } = useOrganization();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        // Ensure user belongs to a platform account
        if (activeAccount?.type !== 'platform') {
            router.replace('/dashboard');
            return;
        }

        // Assert allowed_country_code is NULL/undefined for Global Admins.
        // If they have a set country code (e.g. 'KE'), they are a Local Admin.
        const hasLocalCountryScope = Boolean(activeAccount?.country_code);

        if (hasLocalCountryScope) {
            // Local admins are redirected to the country-specific operational dashboard
            router.replace('/dashboard/admin');
        }
    }, [activeAccount, isLoading, router]);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-utility-primaryBackground)' }}>
                <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px' }}>Verifying system privileges...</div>
            </div>
        );
    }

    return (
        <AccountGuard allowedTypes={['platform']}>
            {children}
        </AccountGuard>
    );
}
