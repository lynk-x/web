import React from 'react';
import AccountGuard from '@/components/dashboard/AccountGuard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Partner Center',
};

/**
 * Layout wrapper for the partner workspace.
 * Restricts access to advertiser and partner accounts via AccountGuard.
 */
export default function PartnersLayout({ children }: { children: React.ReactNode }) {
    return (
        <AccountGuard
            allowedTypes={['advertiser']}
        >
            {children}
        </AccountGuard>
    );
}
