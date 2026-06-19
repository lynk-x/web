import React from 'react';
import AccountGuard from '@/components/dashboard/AccountGuard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Organizer Dashboard',
};

export default function OrganizeLayout({ children }: { children: React.ReactNode }) {
    return (
        <AccountGuard 
            allowedTypes={['organizer']}
            allowedRoles={['owner', 'member', 'tester']}
        >
            {children}
        </AccountGuard>
    );
}
