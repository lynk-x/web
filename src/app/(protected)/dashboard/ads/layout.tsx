import React from 'react';
import AccountGuard from '@/components/dashboard/AccountGuard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Ads Manager',
};

/**
 * Layout wrapper for the Ads Manager workspace.
 * Restricts access to advertiser accounts via AccountGuard.
 */
export default function AdsLayout({ children }: { children: React.ReactNode }) {
    return (
        <AccountGuard
            allowedTypes={['advertiser']}
        >
            {children}
        </AccountGuard>
    );
}
