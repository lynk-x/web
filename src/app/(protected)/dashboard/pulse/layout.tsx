'use client';

import React from 'react';
import SubNavbar from '../../../../components/dashboard/SubNavbar';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';

export default function PulseLayout({ children }: { children: React.ReactNode }) {
    const navItems = [
        { label: 'Overview', href: '/dashboard/pulse' },
        { label: 'Explorer', href: '/dashboard/pulse/explorer' },
        { label: 'Audience', href: '/dashboard/pulse/audience' },
        { label: 'Reports', href: '/dashboard/pulse/reports' },
        { label: 'Settings', href: '/dashboard/pulse/settings' },
    ];

    return (
        <div className={sharedStyles.container}>
            <SubNavbar items={navItems} />
            <div style={{ marginTop: '24px' }}>
                {children}
            </div>
        </div>
    );
}

