import React from 'react';
import AccountGuard from '@/components/dashboard/AccountGuard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Ad Center',
};

export default function AdsLayout({ children }: { children: React.ReactNode }) {
    return <AccountGuard allowedTypes={['advertiser']}>{children}</AccountGuard>;
}
