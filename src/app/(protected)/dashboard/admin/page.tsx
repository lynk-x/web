"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import adminStyles from './page.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import SystemHealth from '@/components/admin/system/SystemHealth';
import WorldClock from '@/components/admin/overview/WorldClock';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

const AdminMap = dynamic(() => import('@/components/admin/overview/AdminMap'), { ssr: false });

interface AdminSummary {
    total_users: number;
    active_users_24h: number;
    active_events: number;
    active_campaigns: number;
    pending_moderation: number;
    kyc_pending_review: number;
    pending_payouts: number;
    total_transactions: number;
    commission_volume: number;
    gross_volume: number;
    escrow_balance_total: number;
}

export default function AdminDashboard() {
    const supabase = useMemo(() => createClient(), []);
    const [summary, setSummary] = useState<AdminSummary | null>(null);

    const fetchSummary = useCallback(async () => {
        const { data, error } = await supabase.rpc('admin_stat_summary');
        if (error) {
            console.error('Error fetching admin summary:', error);
            return;
        }
        if (data) setSummary(data);
    }, [supabase]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Admin Overview"
                subtitle="Welcome back, Administrator. Here's what's happening today."
            />

            <WorldClock />

            <section style={{ marginBottom: 'var(--spacing-xl)' }}>
                <SystemHealth summary={summary} />
            </section>

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
