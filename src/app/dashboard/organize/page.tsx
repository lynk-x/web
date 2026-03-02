"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import Link from 'next/link';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency } from '@/utils/format';

export default function DashboardOverview() {
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    const [stats, setStats] = useState({
        revenue: 0,
        sellThroughRate: 0,
        checkInRate: 0,
        teamSize: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!activeAccount) return;
            setIsLoading(true);

            try {
                // Fetch events, tickets, and team info
                const [eventsRes, teamRes] = await Promise.all([
                    supabase
                        .from('events')
                        .select(`
                            id,
                            status,
                            attendee_count,
                            ticket_tiers(
                                price,
                                quantity_total,
                                quantity_sold
                            )
                        `)
                        .eq('account_id', activeAccount.id),
                    supabase
                        .from('account_members')
                        .select('id', { count: 'exact' })
                        .eq('account_id', activeAccount.id)
                ]);

                if (eventsRes.error) throw eventsRes.error;

                let revenue = 0;
                let totalCapacity = 0;
                let ticketsSold = 0;
                let totalCheckedIn = 0;

                eventsRes.data?.forEach((ev: any) => {
                    // Total Checked in comes directly from event stats
                    totalCheckedIn += ev.attendee_count || 0;

                    if (ev.ticket_tiers) {
                        ev.ticket_tiers.forEach((tier: any) => {
                            ticketsSold += tier.quantity_sold || 0;
                            totalCapacity += tier.quantity_total || 0;
                            revenue += (tier.quantity_sold || 0) * (tier.price || 0);
                        });
                    }
                });

                const sellThroughRate = totalCapacity > 0 ? (ticketsSold / totalCapacity) * 100 : 0;
                const checkInRate = ticketsSold > 0 ? (totalCheckedIn / ticketsSold) * 100 : 0;
                const teamSize = teamRes.count || 1; // Fallback to 1 for the owner

                setStats({
                    revenue,
                    sellThroughRate,
                    checkInRate,
                    teamSize
                });

            } catch (error) {
                console.error("Dashboard overview fetch error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (!isOrgLoading && activeAccount) {
            fetchDashboardData();
        } else if (!isOrgLoading && !activeAccount) {
            // No active org — show zero state rather than misleading mock data
            setStats({ revenue: 0, sellThroughRate: 0, checkInRate: 0, teamSize: 0 });
            setIsLoading(false);
        }
    }, [isOrgLoading, activeAccount, supabase]);
    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title={activeAccount ? `Welcome back to ${activeAccount.name} 👋` : 'Welcome back 👋'}
                subtitle="Here is what is happening with your events today."
            />

            <div className={sharedStyles.statsGrid}>
                <StatCard
                    label="Total Revenue"
                    value={isLoading ? '...' : formatCurrency(stats.revenue)}
                    isLoading={isLoading}
                />
                <StatCard
                    label="Sell-Through Rate"
                    value={isLoading ? '...' : `${stats.sellThroughRate.toFixed(1)}%`}
                    change="Tickets sold / Capacity"
                    trend="neutral"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Check-In Rate"
                    value={isLoading ? '...' : `${stats.checkInRate.toFixed(1)}%`}
                    change="Attendees / Tickets Sold"
                    trend="neutral"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Team Size"
                    value={isLoading ? '...' : stats.teamSize}
                    href="/dashboard/organize/settings?tab=team"
                    change="Manage Team"
                    trend="neutral"
                    isLoading={isLoading}
                />
            </div>

            {/* Quick Actions */}
            <section className={styles.quickActions}>
                <h2 className={sharedStyles.sectionTitle}>Quick Actions</h2>
                <div className={styles.actionsGrid}>
                    <button className={styles.actionCard} onClick={() => router.push('/dashboard/organize/events/create')}>
                        <span className={styles.actionLabel}>Create Event</span>
                    </button>
                    <button className={styles.actionCard} onClick={() => router.push('/dashboard/organize/analytics')}>
                        <span className={styles.actionLabel}>View Analytics</span>
                    </button>
                    <button className={styles.actionCard} onClick={() => router.push('/dashboard/organize/revenue')}>
                        <span className={styles.actionLabel}>View Revenue</span>
                    </button>
                    <button className={styles.actionCard} onClick={() => router.push('/dashboard/organize/settings?tab=team')}>
                        <span className={styles.actionLabel}>Manage Team</span>
                    </button>
                </div>
            </section>


        </div>
    );
}
