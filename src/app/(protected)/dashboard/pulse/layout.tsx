import React from 'react';
import AccountGuard from '@/components/dashboard/AccountGuard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pulse Analytics',
};

export default function PulseLayout({ children }: { children: React.ReactNode }) {
    return (
        <AccountGuard 
            allowedTypes={['pulse_user']}
            allowedRoles={['owner', 'member', 'tester', 'guest']}
        >
            {children}
        </AccountGuard>
    );
}
