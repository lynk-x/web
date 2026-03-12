"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

const AdminMap = dynamic(() => import('@/components/admin/overview/AdminMap'), { ssr: false });

export default function AdminDashboard() {
    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Admin Overview"
                subtitle="Welcome back, Administrator. Here's what's happening today."
            />

            {/* Map Section */}
            <section style={{ marginTop: '24px' }}>
                <h2 className={sharedStyles.sectionTitle}>Live Activity Map</h2>
                <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden', height: '600px', position: 'relative' }}>
                    <AdminMap />
                </div>
            </section>
        </div>
    );
}
