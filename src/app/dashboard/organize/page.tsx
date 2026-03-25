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
                // Fetch events, team, and spotlights
                const [eventsRes, teamRes, spotlightsRes] = await Promise.all([
                    supabase
                        .from('events')
                        .select(`
                            id,
                            status,
                            starts_at
                        `)
                        .eq('account_id', activeAccount.id),
                    supabase
                        .from('account_members')
                        .select('id', { count: 'exact' })
                        .eq('account_id', activeAccount.id),
                    supabase
                        .from('spotlights')
                        .select('*')
                        .in('target', ['all', 'organize_dashboard'])
                        .eq('is_active', true)
                        .order('display_order', { ascending: true })
                ]);

                if (eventsRes.error) throw eventsRes.error;

                const allEvents = eventsRes.data || [];
                const totalEvents = allEvents.length;
                const activeEvents = allEvents.filter((ev: any) => ev.status === 'published' || ev.status === 'active').length;
                
                const now = new Date();
                const upcomingEvents = allEvents.filter((ev: any) => {
                    const startsAt = new Date(ev.starts_at);
                    return startsAt > now && (ev.status === 'published' || ev.status === 'active');
                }).length;

                const teamSize = teamRes.count || 0;

                setStats({
                    totalEvents,
                    upcomingEvents,
                    activeEvents,
                    teamSize
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

            } catch (error: any) {
                showToast(error.message || "Failed to load dashboard data.", "error");
            } finally {
                setIsLoading(false);
            }
        };

        if (!isOrgLoading) {
            if (activeAccount) {
                fetchDashboardData();
            } else {
                // If accounts.length === 0 or activeAccount is missing, stop loading
                setIsLoading(false);
                if (accounts.length === 0) {
                    setStats({ totalEvents: 0, upcomingEvents: 0, activeEvents: 0, teamSize: 0 });
                }
            }
        }
    }, [isOrgLoading, activeAccount, accounts, supabase]);
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
                    <button className={styles.actionCard} onClick={() => router.push('/dashboard/organize/revenue')}>
                        <span className={styles.actionLabel}>View Revenue</span>
                    </button>
                    <button className={styles.actionCard} onClick={() => router.push('/dashboard/organize/settings?tab=team')}>
                        <span className={styles.actionLabel}>Manage Team</span>
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
                        content: 'Let\'s get you set up to host unforgettable events. Follow this quick tour to learn the ropes.',
                        disableBeacon: true,
                    },
                    {
                        target: '.tour-stats',
                        title: 'Performance Overview',
                        content: 'Here you can track your total events, active events, and team size at a glance.',
                    },
                    {
                        target: '.tour-create-event',
                        title: 'Launch a new event',
                        content: 'Ready to start? Click here to create your next event, set up ticket tiers, and add your graphics.',
                    },
                    {
                        target: '.tour-view-analytics',
                        title: 'Understand your audience',
                        content: 'Dive deep into your event analytics and ticket sales data here.',
                    }
                ]}
            />
        </div>
    );
}
