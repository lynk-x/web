import React from 'react';
import SystemAdminClientLayout from './SystemAdminClientLayout';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'System Admin',
};

export default function SystemAdminLayout({ children }: { children: React.ReactNode }) {
    return <SystemAdminClientLayout>{children}</SystemAdminClientLayout>;
}
