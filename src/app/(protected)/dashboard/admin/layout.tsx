import React from 'react';
import AccountGuard from '@/components/dashboard/AccountGuard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Platform Admin',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AccountGuard 
            allowedTypes={['platform']}
            allowedRoles={['super_admin', 'admin', 'support_agent', 'moderator', 'reviewer']}
        >
            {children}
        </AccountGuard>
    );
}
