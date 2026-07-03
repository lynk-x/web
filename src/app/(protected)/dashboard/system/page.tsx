'use client';

/**
 * Global System Dashboard landing page.
 * Mirrors the Admin Overview page with high-fidelity world clocks,
 * and a live global activity tracking map.
 */

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import WorldClock from '@/components/system/overview/WorldClock';

// Dynamically import the Live Activity Map to prevent server-side rendering issues
const AdminMap = dynamic(() => import('@/components/admin/overview/AdminMap'), { ssr: false });

export default function SystemDashboardPage() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="System Overview"
                subtitle="Global Platform Operations Control Room. Monitor platform health, live transactions, and administer central systems."
            />

            {/* High-Fidelity World Clocks */}
            <WorldClock />

            {/* Live Activity Monitoring Map */}
            <section style={{ marginTop: '32px', marginBottom: '32px' }}>
                <h2 className={sharedStyles.sectionTitle}>Global Activity Map</h2>
                <div style={{ border: '1px solid var(--color-interface-border-subtle)', borderRadius: '12px', overflow: 'hidden', height: '500px', position: 'relative', background: 'var(--color-interface-surface-alt)' }}>
                    {isMounted ? (
                        <AdminMap />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                            Initializing Global Activity Tracking...
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
