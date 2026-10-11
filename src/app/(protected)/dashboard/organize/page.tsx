"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import SystemBannerSpotlight from '@/components/shared/SystemBannerSpotlight';
import ProductTour from '@/components/dashboard/ProductTour';
import { formatTime } from '@/utils/format';

export default function DashboardOverview() {
    const { showToast } = useToast();
    const { activeAccount, accounts, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    interface DashboardStats {
        totalEvents: number | null;
        upcomingEvents: number | null;
        activeEvents: number | null;
        teamSize: number | null;
    }
    const [stats, setStats] = useState<DashboardStats>({
        totalEvents: null,
        upcomingEvents: null,
        activeEvents: null,
        teamSize: null,
    });
    interface Spotlight {
        id: string;
        title: string;
        subtitle: string;
        backgroundImage: string;
        ctaLabel: string;
        ctaHref: string;
    }
    /** The account's event that is on right now; null when none is live. */
    interface LiveEvent {
        id: string;
        title: string;
        startsAt: string;
        ticketsSold: number;
        checkedIn: number;
    }
    const [liveEvent, setLiveEvent] = useState<LiveEvent | null>(null);
    const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Finds the account's event that is on right now, using the same organizer RPCs as the events pages: the recent
     * events list for the live window, then the event details for tickets sold and scanned. A failure here only
     * hides the card, so it never blocks the rest of the dashboard.
     */
    const findLiveEvent = useCallback(async (accountId: string): Promise<LiveEvent | null> => {
        try {
            const { data: list, error: listError } = await supabase.schema('api').rpc('get_organizer_events', {
                p_account_id: accountId,
                p_params: { search: '', status: 'all', limit: 20, offset: 0 },
            });
            if (listError) throw listError;

            const now = Date.now();
            const live = (list?.items ?? []).find((e: { status: string; starts_at: string; ends_at: string | null }) =>
                (e.status === 'published' || e.status === 'active') &&
                new Date(e.starts_at).getTime() <= now &&
                (!e.ends_at || new Date(e.ends_at).getTime() >= now),
            );
            if (!live) return null;

            const { data: details, error: detailsError } = await supabase.schema('api').rpc('get_organizer_event_details', {
                p_account_id: accountId,
                p_event_id: live.id,
                p_include_metrics: true,
            });
            if (detailsError) throw detailsError;

            const tiers = (details?.tiers ?? []) as { tickets_sold?: number }[];
            return {
                id: live.id,
                title: live.title,
                startsAt: live.starts_at,
                ticketsSold: tiers.reduce((sum, t) => sum + (t.tickets_sold || 0), 0),
                checkedIn: details?.metrics?.scan_count ?? 0,
            };
        } catch {
            return null;
        }
    }, [supabase]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!activeAccount) return;
            setIsLoading(true);

            try {
                // Fetch consolidated stats and spotlights in parallel
                const [statsRes, spotlightsRes] = await Promise.all([
                    supabase.schema('api').rpc('get_organizer_dashboard_stats', {
                        p_account_id: activeAccount.id
                    }),
                    supabase
                        .schema('api')
                        .from('v1_spotlights')
                        .select('*')
                        .in('target', ['all', 'organizer_dashboard'])
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

                setLiveEvent(await findLiveEvent(activeAccount.id));

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
    }, [isOrgLoading, activeAccount, accounts, supabase, showToast, findLiveEvent]);
    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title={activeAccount ? `Welcome back to ${activeAccount.name} 👋` : 'Hi there👋...Ready to host events?'}
                subtitle="Here is what is happening with your events today."
            />

            {liveEvent && (
                <section className={styles.liveCard} aria-label="Event happening now">
                    <div className={styles.liveHeader}>
                        <span className={styles.livePill}>LIVE NOW</span>
                        <span className={styles.liveMeta}>Started {formatTime(liveEvent.startsAt)}</span>
                    </div>
                    <h2 className={styles.liveTitle}>{liveEvent.title}</h2>
                    <div className={styles.liveProgressRow}>
                        <span>Checked in</span>
                        <span><strong>{liveEvent.checkedIn}</strong> of {liveEvent.ticketsSold}</span>
                    </div>
                    <div
                        className={styles.liveBar}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={liveEvent.ticketsSold}
                        aria-valuenow={liveEvent.checkedIn}
                        aria-label="Guests checked in"
                    >
                        <div
                            className={styles.liveBarFill}
                            style={{ width: `${liveEvent.ticketsSold > 0 ? Math.min(100, (liveEvent.checkedIn / liveEvent.ticketsSold) * 100) : 0}%` }}
                        />
                    </div>
                    <p className={styles.liveNote}>Guests are scanned in at the door with the Lynk-X app.</p>
                    <Link href={`/dashboard/organize/events/${liveEvent.id}`} className={styles.liveAction}>
                        Event details
                    </Link>
                </section>
            )}

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
                    <button type="button" className={`${styles.actionCard} tour-create-event`} onClick={() => router.push('/dashboard/organize/events/create')}>
                        <span className={styles.actionLabel}>Create Event</span>
                    </button>
                    <button type="button" className={`${styles.actionCard} tour-view-analytics`} onClick={() => router.push('/dashboard/organize/analytics')}>
                        <span className={styles.actionLabel}>View Analytics</span>
                    </button>
                    <button type="button" className={`${styles.actionCard} tour-revenue`} onClick={() => router.push('/dashboard/organize/revenue')}>
                        <span className={styles.actionLabel}>Revenue</span>
                    </button>
                    <button type="button" className={`${styles.actionCard} tour-team`} onClick={() => router.push('/dashboard/organize/settings?tab=team')}>
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
                        content: 'This is your command center for hosting events on Lynk-X. Create and manage events, track ticket sales, monitor revenue and grow your audience — all from one place.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-stats',
                        title: 'Live Performance Snapshot',
                        content: 'These cards give you an at-a-glance view of your portfolio: total events created, upcoming events on your calendar and how many are currently live and accepting tickets.',
                    },
                    {
                        target: '.tour-create-event',
                        title: 'Create Your First Event',
                        content: 'Tap here to launch the event creation wizard. You\'ll walk through setting a cover image, description, ticket tiers, location and more — step by step.',
                    },
                    {
                        target: '.tour-view-analytics',
                        title: 'Understand Your Audience',
                        content: 'View aggregated analytics across all your events — including ticket sales trends, revenue over time and category performance — to make smarter decisions.',
                    },
                    {
                        target: '.tour-revenue',
                        title: 'Revenue & Payouts',
                        content: 'Access your financial dashboard to see gross revenue, available balance and payout history. This is where you request withdrawals to your linked payment method.',
                    },
                    {
                        target: '.tour-team',
                        title: 'Collaborate With Your Team',
                        content: 'Invite team members and assign roles like Scanner or Finance Manager. You control who can edit events, manage check-ins or view financial data.',
                    },
                ]}
            />
        </div>
    );
}
