import React from 'react';
import AccountGuard from '@/components/dashboard/AccountGuard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Platform Admin',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AccountGuard allowedTypes={['platform']}>{children}</AccountGuard>;
}
