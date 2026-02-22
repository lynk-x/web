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
        ticketsSold: 0,
        activeEvents: 0,
        upcomingEvents: 0,
        pastEvents: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!activeAccount) return;
            setIsLoading(true);

            try {
                // Fetch events and their aggregated ticket tiers for this account
                const { data: events, error } = await supabase
                    .from('events')
                    .select(`
                        status,
                        ticket_tiers(
                            price,
                            quantity_sold
                        )
                    `)
                    .eq('account_id', activeAccount.id);

                if (error) throw error;

                let revenue = 0;
                let ticketsSold = 0;
                let activeCount = 0;
                let upcomingCount = 0;
                let pastCount = 0;

                events?.forEach((ev: any) => {
                    // Count event statuses
                    if (ev.status === 'published') { // Adjust based on your enum, e.g. active/published
                        activeCount++;
                        upcomingCount++; // Assuming published means upcoming for MVP
                    } else if (ev.status === 'cancelled') {
                        pastCount++; // Simplification
                    }

                    // Tally revenue and tickets
                    if (ev.ticket_tiers) {
                        ev.ticket_tiers.forEach((tier: any) => {
                            ticketsSold += tier.quantity_sold || 0;
                            revenue += (tier.quantity_sold || 0) * (tier.price || 0);
                        });
                    }
                });

                setStats({
                    revenue,
                    ticketsSold,
                    activeEvents: activeCount,
                    upcomingEvents: upcomingCount,
                    pastEvents: pastCount
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
            setIsLoading(false);
        }
    }, [isOrgLoading, activeAccount]);
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
                    <span className={styles.statLabel}>Tickets Sold</span>
                    <div className={styles.statValue}>
                        {isLoading ? '...' : stats.ticketsSold.toLocaleString()}
                    </div>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Active Events</span>
                    <div className={styles.statValue}>
                        {isLoading ? '...' : stats.activeEvents}
                    </div>
                    <span className={styles.statNote}>
                        {isLoading ? '' : `${stats.upcomingEvents} upcoming`}
                    </span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Page Views</span>
                    <div className={styles.statValue}>12.5k</div>
                    <span className={`${styles.statChange} ${styles.negative}`}>-2% from last week</span>
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
