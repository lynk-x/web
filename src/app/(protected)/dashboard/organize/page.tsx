"use client";
import { getErrorMessage } from '@/utils/error';

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
import { useToast } from '@/components/ui/Toast';
import SystemBannerSpotlight from '@/components/shared/SystemBannerSpotlight';
import ProductTour from '@/components/dashboard/ProductTour';

export default function DashboardOverview() {
    const { showToast } = useToast();
    const { activeAccount, accounts, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    const [stats, setStats] = useState<any>({
        totalEvents: null,
        upcomingEvents: null,
        activeEvents: null,
        teamSize: null,
    });
    const [spotlights, setSpotlights] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!activeAccount) return;
            setIsLoading(true);

            try {
                // Fetch consolidated stats and spotlights in parallel
                const [statsRes, spotlightsRes] = await Promise.all([
                    supabase.rpc('get_organizer_dashboard_stats', {
                        p_account_id: activeAccount.id
                    }),
                    supabase
                        .from('spotlights')
                        .select('*')
                        .in('target', ['all', 'organize_dashboard'])
                        .eq('is_active', true)
                        .order('display_order', { ascending: true })
                ]);

                if (statsRes.error) throw statsRes.error;

                const data = statsRes.data;
                setStats({
                    totalEvents: data.total_events,
                    upcomingEvents: data.upcoming_events,
                    activeEvents: data.active_events,
                    teamSize: data.team_size
                });

                // Set Spotlights
                if (spotlightsRes.data) {
                    setSpotlights(spotlightsRes.data.map(s => ({
                        id: s.id,
                        title: s.title,
                        subtitle: s.subtitle,
                        backgroundImage: s.background_url,
                        ctaLabel: s.cta_text,
                        ctaHref: s.redirect_to
                    })));
                }

            } catch (error: unknown) {
                showToast(getErrorMessage(error) || "Failed to load dashboard data.", "error");
            } finally {
                setIsLoading(false);
            }
        };

        if (!isOrgLoading) {
            if (activeAccount) {
                fetchDashboardData();
            } else {
                setIsLoading(false);
                if (accounts.length === 0) {
                    setStats({ totalEvents: 0, upcomingEvents: 0, activeEvents: 0, teamSize: 0 });
                }
            }
        }
    }, [isOrgLoading, activeAccount, accounts, supabase, showToast]);
    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title={activeAccount ? `Welcome back to ${activeAccount.name} 👋` : 'Hi there👋...Ready to host events?'}
                subtitle="Here is what is happening with your events today."
            />

            <div className={`${sharedStyles.statsGrid} tour-stats`}>
                <StatCard
                    label="Total Events"
                    value={stats.totalEvents !== null ? stats.totalEvents : null}
                    change="All time history"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Upcoming Events"
                    value={stats.upcomingEvents !== null ? stats.upcomingEvents : null}
                    change="Next 30 days"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Active Events"
                    value={stats.activeEvents !== null ? stats.activeEvents : null}
                    change="Publicly visible"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Team Size"
                    value={stats.teamSize !== null ? stats.teamSize : null}
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
                    <button className={`${styles.actionCard} tour-create-event`} onClick={() => router.push('/dashboard/organize/events/create')}>
                        <span className={styles.actionLabel}>Create Event</span>
                    </button>
                    <button className={`${styles.actionCard} tour-view-analytics`} onClick={() => router.push('/dashboard/organize/analytics')}>
                        <span className={styles.actionLabel}>View Analytics</span>
                    </button>
                    <button className={`${styles.actionCard} tour-revenue`} onClick={() => router.push('/dashboard/organize/revenue')}>
                        <span className={styles.actionLabel}>Revenue</span>
                    </button>
                    <button className={`${styles.actionCard} tour-team`} onClick={() => router.push('/dashboard/organize/settings?tab=team')}>
                        <span className={styles.actionLabel}>Team Management</span>
                    </button>
                </div>
            </section>

            {/* Hero Spotlights */}
            {spotlights.length > 0 && (
                <section style={{ marginTop: '16px', marginBottom: '40px' }}>
                    <SystemBannerSpotlight slides={spotlights} />
                </section>
            )}

            <ProductTour
                storageKey={activeAccount ? `hasSeenOrganizeJoyride_${activeAccount.id}` : 'hasSeenOrganizeJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Welcome to your Organize Dashboard!',
                        content: 'Let\'s get you set up to host unforgettable events. This dashboard is your central hub for all organizer activities.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-stats',
                        title: 'Performance Overview',
                        content: 'Track your total events, upcoming scheduled events and active public listings at a glance.',
                    },
                    {
                        target: '.tour-create-event',
                        title: 'Create an event',
                        content: 'Ready to start? Click here to create your next event, set up ticket tiers and add your marketing materials.',
                    },
                    {
                        target: '.tour-view-analytics',
                        title: 'Understand your audience',
                        content: 'Dive deep into your event analytics and ticket sales data to understand your growth and attendee behavior.',
                    },
                    {
                        target: '.tour-revenue',
                        title: 'Financial Health',
                        content: 'Quick access to your revenue dashboard, payout history and wallet balances.',
                    },
                    {
                        target: '.tour-team',
                        title: 'Team Management',
                        content: 'Invite collaborators and manage permissions for your organization.',
                    },
                ]}
            />
        </div>
    );
}
