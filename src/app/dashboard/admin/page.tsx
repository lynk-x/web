"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

const AdminMap = dynamic(() => import('@/components/admin/overview/AdminMap'), { ssr: false });

interface DashboardStats {
    escrow: number;
    activeUsers: number;
    proMembers: number;
    pendingAds: number;
    supportTickets: number;
    moderationQueue: number;
}

export default function AdminDashboard() {
    const supabase = useMemo(() => createClient(), []);
    const [statsData, setStatsData] = useState<DashboardStats>({
        escrow: 0,
        activeUsers: 0,
        proMembers: 0,
        pendingAds: 0,
        supportTickets: 0,
        moderationQueue: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                // 1. Fetch Escrow (Sum of all account balances)
                const { data: escrowData } = await supabase
                    .from('accounts')
                    .select('wallet_balance');
                const totalEscrow = (escrowData || []).reduce((acc, curr) => acc + (Number(curr.wallet_balance) || 0), 0);

                // 2. Fetch Active Users Count
                const { count: activeUsersCount } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_active', true);

                // 3. Fetch Pro Members — subscription_tier lives on profiles, not accounts
                const { count: proCount } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('subscription_tier', 'pro');

                // 4. Fetch Pending Ad Campaigns (Draft status)
                const { count: adCount } = await supabase
                    .from('ad_campaigns')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'draft');

                // 5. Fetch Open Support Tickets
                const { count: ticketCount } = await supabase
                    .from('support_tickets')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['open', 'in_progress']);

                // 6. Fetch Moderation Queue (Pending reports)
                const { count: reportsCount } = await supabase
                    .from('reports')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending');

                setStatsData({
                    escrow: totalEscrow,
                    activeUsers: activeUsersCount || 0,
                    proMembers: proCount || 0,
                    pendingAds: adCount || 0,
                    supportTickets: ticketCount || 0,
                    moderationQueue: reportsCount || 0
                });
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchStats();
    }, []);

    const stats = [
        {
            label: 'Platform Escrow',
            value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', notation: 'compact' }).format(statsData.escrow),
            change: 'Total Wallet Balances',
            isPositive: true,
            href: '/dashboard/admin/finance'
        },
        {
            label: 'Active Users',
            value: statsData.activeUsers.toLocaleString(),
            change: '+Live Activity',
            isPositive: true,
            href: '/dashboard/admin/users'
        },
        {
            label: 'Pro Members',
            value: statsData.proMembers.toLocaleString(),
            change: 'Premium Conversion',
            isPositive: true,
            href: '/dashboard/admin/users'
        },
        {
            label: 'Ad Campaigns',
            value: statsData.pendingAds.toLocaleString(),
            change: 'Awaiting Approval',
            isPositive: false,
            color: 'var(--color-brand-primary)',
            href: '/dashboard/admin/campaigns'
        },
        {
            label: 'Support Tickets',
            value: statsData.supportTickets.toLocaleString(),
            change: 'Awaiting Response',
            isPositive: false,
            color: '#ffb74d',
            href: '/dashboard/admin/support'
        },
        {
            label: 'Moderation Queue',
            value: statsData.moderationQueue.toLocaleString(),
            change: 'Flagged Content',
            isPositive: false,
            color: 'var(--color-interface-error)',
            href: '/dashboard/admin/support'
        },
    ];

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Admin Overview"
                subtitle="Welcome back, Administrator. Here's what's happening today."
            />

            {/* Key Metrics */}
            <div className={sharedStyles.statsGrid}>
                {stats.map((stat, index) => (
                    <StatCard
                        key={index}
                        label={stat.label}
                        value={stat.value}
                        change={stat.change}
                        isPositive={stat.isPositive}
                        href={stat.href}
                        isLoading={isLoading}
                        color={stat.color}
                    />
                ))}
            </div>

            {/* Map Section */}
            <section style={{ marginTop: '24px' }}>
                <h2 className={sharedStyles.sectionTitle}>Live Activity Map</h2>
                <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden', height: '500px', position: 'relative' }}>
                    <AdminMap />
                </div>
            </section>
        </div>
    );
}
