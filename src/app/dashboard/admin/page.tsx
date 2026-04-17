"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import adminStyles from './page.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import SystemHealth from '@/components/admin/system/SystemHealth';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

const AdminMap = dynamic(() => import('@/components/admin/overview/AdminMap'), { ssr: false });

interface AdminSummary {
    total_users: number;
    active_events: number;
    active_campaigns: number;
    pending_moderation: number;
    pending_kyc: number;
    pending_payouts: number;
    total_transactions_today: number;
    total_revenue_today: number;
}

export default function AdminDashboard() {
    const supabase = useMemo(() => createClient(), []);
    const [summary, setSummary] = useState<AdminSummary | null>(null);

    const fetchSummary = useCallback(async () => {
        const { data, error } = await supabase.rpc('admin_stat_summary');
        if (error) {
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

            {/* Quick Stats */}
            <div className={sharedStyles.statsGrid}>
                <Link href="/dashboard/admin/moderation" style={{ textDecoration: 'none' }}>
                    <StatCard
                        label="Pending Moderation"
                        value={summary?.pending_moderation ?? 0}
                        change="Items awaiting review"
                        trend={(summary?.pending_moderation ?? 0) > 0 ? "negative" : "positive"}
                        isLoading={!summary}
                    />
                </Link>
                <Link href="/dashboard/admin/users/verifications" style={{ textDecoration: 'none' }}>
                    <StatCard
                        label="Pending KYC"
                        value={summary?.pending_kyc ?? 0}
                        change="Verifications to review"
                        trend={(summary?.pending_kyc ?? 0) > 0 ? "negative" : "positive"}
                        isLoading={!summary}
                    />
                </Link>
                <Link href="/dashboard/admin/finance" style={{ textDecoration: 'none' }}>
                    <StatCard
                        label="Pending Payouts"
                        value={summary?.pending_payouts ?? 0}
                        change="Awaiting approval"
                        trend="neutral"
                        isLoading={!summary}
                    />
                </Link>
                <Link href="/dashboard/admin/users" style={{ textDecoration: 'none' }}>
                    <StatCard
                        label="Total Users"
                        value={summary?.total_users ?? 0}
                        change="Platform accounts"
                        trend="positive"
                        isLoading={!summary}
                    />
                </Link>
                <Link href="/dashboard/admin/events" style={{ textDecoration: 'none' }}>
                    <StatCard
                        label="Active Events"
                        value={summary?.active_events ?? 0}
                        change="Currently live"
                        trend="positive"
                        isLoading={!summary}
                    />
                </Link>
                <Link href="/dashboard/admin/campaigns" style={{ textDecoration: 'none' }}>
                    <StatCard
                        label="Active Campaigns"
                        value={summary?.active_campaigns ?? 0}
                        change="Running ads"
                        trend="positive"
                        isLoading={!summary}
                    />
                </Link>
            </div>

            {/* System Health */}
            <section>
                <h2 className={sharedStyles.sectionTitle}>System Health</h2>
                <SystemHealth />
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
