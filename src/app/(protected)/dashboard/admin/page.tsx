"use client";

/**
 * Local Platform Administrative Dashboard Overview.
 * Displays territory-scoped statistics, quick-action operational buttons
 * styled identical to the organizer/ads dashboard, and a live consolidated
 * Territory Activity & Audit Log feed spanning full-width below.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import styles from './page.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';

interface ActivityItem {
    id: string;
    type: 'account' | 'event' | 'kyc';
    title: string;
    description: string;
    timestamp: string;
}

export default function AdminDashboard() {
    const supabase = useMemo(() => createClient(), []);
    const { activeAccount } = useOrganization();
    const router = useRouter();

    const [isMounted, setIsMounted] = useState(false);
    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [isActivityLoading, setIsActivityLoading] = useState(true);
    const [stats, setStats] = useState({
        organizers: 0,
        advertisers: 0,
        pulseUsers: 0,
        teamSize: 0
    });
    const [activities, setActivities] = useState<ActivityItem[]>([]);

    // Helper to get selected active country scope, supporting proxy overrides for platform admins
    const getActiveCountry = useCallback(() => {
        if (!activeAccount) return 'all';
        if (typeof window !== 'undefined') {
            const proxyCode = localStorage.getItem('lynks_proxy_country_code');
            if (proxyCode && activeAccount.type === 'platform') {
                return proxyCode;
            }
        }
        return activeAccount.country_code || 'all';
    }, [activeAccount]);

    // 1. Fetch Local Segment Statistics (Option A)
    const fetchStats = useCallback(async () => {
        if (!activeAccount) return;
        setIsStatsLoading(true);
        try {
            const country = getActiveCountry();

            // Count organizers in the active country
            let orgQuery = supabase
                .schema('api' as any)
                .from('v1_accounts')
                .select('*', { count: 'exact', head: true })
                .eq('type', 'organizer');
            if (country !== 'all') {
                orgQuery = orgQuery.eq('country_code', country);
            }
            const { count: orgs } = await orgQuery;

            // Count advertisers in the active country
            let advQuery = supabase
                .schema('api' as any)
                .from('v1_accounts')
                .select('*', { count: 'exact', head: true })
                .eq('type', 'advertiser');
            if (country !== 'all') {
                advQuery = advQuery.eq('country_code', country);
            }
            const { count: advs } = await advQuery;

            // Count community/pulse attendees in the active country
            let pulseQuery = supabase
                .schema('api' as any)
                .from('v1_accounts')
                .select('*', { count: 'exact', head: true })
                .in('type', ['pulse_user', 'attendee']);
            if (country !== 'all') {
                pulseQuery = pulseQuery.eq('country_code', country);
            }
            const { count: pulses } = await pulseQuery;

            // Count local administration team members
            const { count: team } = await supabase
                .from('account_members')
                .select('*', { count: 'exact', head: true })
                .eq('account_id', activeAccount.id);

            setStats({
                organizers: orgs || 0,
                advertisers: advs || 0,
                pulseUsers: pulses || 0,
                teamSize: team || 0
            });
        } catch (err) {
            console.error('Failed to fetch admin dashboard stats:', err);
        } finally {
            setIsStatsLoading(false);
        }
    }, [activeAccount, supabase, getActiveCountry]);

    // 2. Fetch Consolidated Territory Activity Log
    const fetchActivityLog = useCallback(async () => {
        if (!activeAccount) return;
        setIsActivityLoading(true);
        try {
            const country = getActiveCountry();
            const logList: ActivityItem[] = [];

            // A. Fetch recent account signups in this country
            let accQuery = supabase
                .schema('api' as any)
                .from('v1_accounts')
                .select('id, name:display_name, type, created_at')
                .order('created_at', { ascending: false })
                .limit(5);
            if (country !== 'all') {
                accQuery = accQuery.eq('country_code', country);
            }
            const { data: recentAccounts } = await accQuery;

            if (recentAccounts) {
                recentAccounts.forEach(acc => {
                    const profileLabel = acc.type === 'organizer' ? 'Organizer' : acc.type === 'advertiser' ? 'Advertiser' : 'Pulse User';
                    logList.push({
                        id: `acc-${acc.id}`,
                        type: 'account',
                        title: `New ${profileLabel} Registration`,
                        description: `"${acc.name}" onboarded to the territory base.`,
                        timestamp: acc.created_at
                    });
                });
            }

            // B. Fetch recent event creations inside this country
            let eventQuery = supabase
                .from('events')
                .select('id, title, created_at')
                .order('created_at', { ascending: false })
                .limit(5);
            if (country !== 'all') {
                eventQuery = eventQuery.eq('country_code', country);
            }
            const { data: recentEvents } = await eventQuery;

            if (recentEvents) {
                recentEvents.forEach(ev => {
                    logList.push({
                        id: `ev-${ev.id}`,
                        type: 'event',
                        title: 'Local Event Created',
                        description: `"${ev.title}" was registered and is awaiting moderation approvals.`,
                        timestamp: ev.created_at
                    });
                });
            }

            // Sort consolidated logs chronologically (newest first)
            logList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            // Limit to top 8 items
            setActivities(logList.slice(0, 8));
        } catch (err) {
            console.error('Failed to compile territory activity logs:', err);
        } finally {
            setIsActivityLoading(false);
        }
    }, [activeAccount, supabase, getActiveCountry]);

    useEffect(() => {
        setIsMounted(true);
        if (activeAccount) {
            fetchStats();
            fetchActivityLog();
        }
    }, [activeAccount, fetchStats, fetchActivityLog]);

    const activeCountryCode = getActiveCountry();
    const countryLabel = activeCountryCode !== 'all'
        ? `(${activeCountryCode.toUpperCase()} Territory${activeAccount?.type === 'platform' ? ' [Proxy]' : ''})`
        : '';

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Admin Overview"
                subtitle={`Welcome back, Administrator. Monitoring platform activity for your region ${countryLabel}.`}
            />

            {/* Dynamic Segment Statistics Panel */}
            <div className={sharedStyles.statsGrid}>
                <StatCard 
                    label="Local Organizers" 
                    value={stats.organizers} 
                    change="Registered merchants" 
                    trend="neutral"
                    isLoading={isStatsLoading}
                    href="/dashboard/admin/users?type=organizer"
                />
                <StatCard 
                    label="Local Advertisers" 
                    value={stats.advertisers} 
                    change="Brand partners" 
                    trend="neutral"
                    isLoading={isStatsLoading}
                    href="/dashboard/admin/users?type=advertiser"
                />
                <StatCard 
                    label="Pulse & Attendee Base" 
                    value={stats.pulseUsers} 
                    change="Active social community" 
                    trend="neutral"
                    isLoading={isStatsLoading}
                    href="/dashboard/admin/users?type=pulse_user"
                />
                <StatCard 
                    label="Admin Office Team" 
                    value={stats.teamSize} 
                    change="Staff members" 
                    trend="neutral"
                    isLoading={isStatsLoading}
                    href="/dashboard/admin/settings?tab=team"
                />
            </div>

            {/* Quick Actions - Identical Layout to Organizer Dashboard */}
            <section className={styles.quickActions}>
                <h2 className={sharedStyles.sectionTitle}>Quick Actions</h2>
                <div className={styles.actionsGrid}>
                    <button className={styles.actionCard} onClick={() => router.push('/dashboard/admin/users?tab=kyc')}>
                        <span className={styles.actionLabel}>KYC Approvals</span>
                    </button>
                    <button className={styles.actionCard} onClick={() => router.push('/dashboard/admin/events')}>
                        <span className={styles.actionLabel}>Moderate Events</span>
                    </button>
                    <button className={styles.actionCard} onClick={() => router.push('/dashboard/admin/finance')}>
                        <span className={styles.actionLabel}>Payout Approvals</span>
                    </button>
                    <button className={styles.actionCard} onClick={() => router.push('/dashboard/admin/settings?tab=team')}>
                        <span className={styles.actionLabel}>Team Management</span>
                    </button>
                </div>
            </section>

            {/* Consolidated Territory Audit & Activity Log - Spanning Full Width Below */}
            <section className={styles.activitySection}>

                <div className={styles.activityFeed}>
                    {isActivityLoading ? (
                        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5, fontSize: '13px' }}>
                            Syncing Activity Feed...
                        </div>
                    ) : activities.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.4, fontSize: '13px' }}>
                            No recent activity logged inside this territory jurisdiction.
                        </div>
                    ) : (
                        activities.map((act) => (
                            <div key={act.id} className={styles.activityItem}>
                                <div className={styles.activityIcon}>
                                    {act.type === 'account' ? '👤' : act.type === 'event' ? '📅' : '🛡️'}
                                </div>
                                <div className={styles.activityContent}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span className={styles.activityText}>{act.title}</span>
                                        <span style={{ fontSize: '12.5px', opacity: 0.7, lineHeight: '1.4' }}>
                                            {act.description}
                                        </span>
                                    </div>
                                    <span className={styles.activityTime}>
                                        {new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
