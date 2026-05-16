"use client";

import dynamic from 'next/dynamic';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import WorldClock from '@/components/admin/overview/WorldClock';
import { useState, useEffect } from 'react';

const AdminMap = dynamic(() => import('@/components/admin/overview/AdminMap'), { ssr: false });

export default function AdminDashboard() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Admin Overview"
                subtitle="Welcome back, Administrator. Here's what's happening today."
            />

            <WorldClock />

            {/* Map Section */}
            <section>
                <h2 className={sharedStyles.sectionTitle}>Live Activity Map</h2>
                <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden', height: '600px', position: 'relative' }}>
                    <AdminMap />
                </div>
            </section>
        </div>
    );
}
