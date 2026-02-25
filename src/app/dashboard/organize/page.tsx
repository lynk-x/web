"use client";

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import Link from 'next/link';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency } from '@/utils/format';

export default function DashboardOverview() {
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = createClient();

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
            setStats({
                revenue: 24500,
                sellThroughRate: 85.4,
                checkInRate: 92.1,
                teamSize: 4
            });
            setIsLoading(false);
        }
    }, [isOrgLoading, activeAccount, supabase]);
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        {activeAccount ? `Welcome back to ${activeAccount.name} 👋` : 'Welcome back 👋'}
                    </h1>
                    <p className={styles.subtitle}>Here is what is happening with your events today.</p>
                </div>

            </header>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Revenue</span>
                    <div className={styles.statValue}>
                        {isLoading ? '...' : formatCurrency(stats.revenue)}
                    </div>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Sell-Through Rate</span>
                    <div className={styles.statValue}>
                        {isLoading ? '...' : `${stats.sellThroughRate.toFixed(1)}%`}
                    </div>
                    <span className={styles.statNote}>Tickets sold / Capacity</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Check-In Rate</span>
                    <div className={styles.statValue}>
                        {isLoading ? '...' : `${stats.checkInRate.toFixed(1)}%`}
                    </div>
                    <span className={styles.statNote}>Attendees / Tickets Sold</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Team Size</span>
                    <div className={styles.statValue}>
                        {isLoading ? '...' : stats.teamSize}
                    </div>
                    <Link href="/dashboard/organize/settings" className={styles.statNote} style={{ textDecoration: 'underline' }}>
                        Manage Team
                    </Link>
                </div>
            </div>

            {/* Quick Actions */}
            <section className={styles.quickActions}>
                <h2 className={styles.sectionTitle}>Quick Actions</h2>
                <div className={styles.actionsGrid}>
                    <button className={styles.actionCard} onClick={() => console.log('Promote')}>
                        <span className={styles.actionLabel}>Promote Event</span>
                    </button>
                    <button className={styles.actionCard} onClick={() => console.log('Export')}>
                        <span className={styles.actionLabel}>Export Report</span>
                    </button>
                    <button className={styles.actionCard} onClick={() => console.log('Messages')}>
                        <span className={styles.actionLabel}>Check Messages</span>
                    </button>
                    <button className={styles.actionCard} onClick={() => console.log('Support')}>
                        <span className={styles.actionLabel}>Help & Support</span>
                    </button>
                </div>
            </section>


        </div>
    );
}
