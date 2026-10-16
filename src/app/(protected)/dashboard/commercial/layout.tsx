import React from 'react';
import AccountGuard from '@/components/dashboard/AccountGuard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Commercial Center',
};

/**
 * Layout wrapper for the commercial workspace.
 * Restricts access to commercial accounts via AccountGuard.
 */
export default function CommercialLayout({ children }: { children: React.ReactNode }) {
    return (
        <AccountGuard
            allowedTypes={['advertiser']}
        >
            {children}
        </AccountGuard>
    );
}
