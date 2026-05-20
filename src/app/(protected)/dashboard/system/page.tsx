'use client';

/**
 * Global System Dashboard landing page.
 * Mirrors the Admin Overview page with high-fidelity world clocks,
 * a live global activity tracking map, real-time database statistics,
 * standard no-emoji quick action buttons matching organizer/ads style,
 * and a live consolidated system audit log feed at the bottom.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import adminStyles from '../admin/page.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import WorldClock from '@/components/admin/overview/WorldClock';
import { createClient } from '@/utils/supabase/client';

// Dynamically import the Live Activity Map to prevent server-side rendering issues
const AdminMap = dynamic(() => import('@/components/admin/overview/AdminMap'), { ssr: false });

interface AuditLogItem {
    id: string;
    action: string;
    actor: {
        name: string;
        email: string;
    };
    targetType: string;
    timestamp: string;
    detailsText: string;
}

export default function SystemDashboardPage() {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    const [isMounted, setIsMounted] = useState(false);
    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [isActivityLoading, setIsActivityLoading] = useState(true);

    const [stats, setStats] = useState({
        mrr: 0,
        activeUsers24h: 0,
        liveEvents: 0,
        pendingGovernance: 0
    });

    const [activities, setActivities] = useState<AuditLogItem[]>([]);

    // 1. Fetch System-Wide Statistics from get_admin_stat_summary()
    const fetchSystemStats = useCallback(async () => {
        setIsStatsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_stat_summary');
            if (error) throw error;

            if (data) {
                const overview = data.overview || {};
                const mrrVal = Number(data.mrr || 0);
                const active24h = Number(overview.active_users_24h || 0);
                const liveEvs = Number(overview.live_events || 0);
                const pendingGov = Number(data.pending_kyc || 0) + Number(data.pending_moderation || 0) + Number(data.pending_payouts || 0);

                setStats({
                    mrr: mrrVal,
                    activeUsers24h: active24h,
                    liveEvents: liveEvs,
                    pendingGovernance: pendingGov
                });
            }
        } catch (err) {
            console.error('Failed to fetch system dashboard stats:', err);
        } finally {
            setIsStatsLoading(false);
        }
    }, [supabase]);

    // 2. Fetch System Audit Trail Logs
    const fetchAuditLogs = useCallback(async () => {
        setIsActivityLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_audit_logs', {
                p_params: {
                    action: 'all',
                    limit: 8,
                    offset: 0,
                    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    to: new Date().toISOString()
                }
            });
            if (error) throw error;

            const logsData = data?.logs || [];
            setActivities(logsData.map((l: any) => {
                const actorName = l.actor?.full_name || l.actor?.user_name || 'System';
                const actionLabel = l.action ? l.action.replace(/_/g, ' ').toUpperCase() : 'ACTION';
                return {
                    id: l.id,
                    action: actionLabel,
                    actor: {
                        name: actorName,
                        email: l.actor?.email || 'system@lynk-x.com'
                    },
                    targetType: l.target_type || 'system',
                    timestamp: l.created_at,
                    detailsText: l.details ? JSON.stringify(l.details) : 'Executed system modification.'
                };
            }));
        } catch (err) {
            console.error('Failed to fetch system activity logs:', err);
        } finally {
            setIsActivityLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        setIsMounted(true);
        fetchSystemStats();
        fetchAuditLogs();
    }, [fetchSystemStats, fetchAuditLogs]);

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="System Overview"
                subtitle="Global Platform Operations Control Room. Monitor platform health, live transactions, and administer central systems."
            />

            {/* High-Fidelity World Clocks */}
            <WorldClock />

            {/* Dynamic System Statistics Panel */}
            <div className={sharedStyles.statsGrid} style={{ marginTop: '24px' }}>
                <StatCard 
                    label="Platform MRR" 
                    value={`$${stats.mrr.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    change="Active global subscriptions" 
                    trend="positive"
                    isLoading={isStatsLoading}
                    href="/dashboard/system/finance"
                />
                <StatCard 
                    label="Active Users (24h)" 
                    value={stats.activeUsers24h} 
                    change="Platform wide engagements" 
                    trend="neutral"
                    isLoading={isStatsLoading}
                    href="/dashboard/system/registry"
                />
                <StatCard 
                    label="Global Live Events" 
                    value={stats.liveEvents} 
                    change="Published merchant events" 
                    trend="neutral"
                    isLoading={isStatsLoading}
                    href="/dashboard/system/proxy"
                />
                <StatCard 
                    label="Governance Backlog" 
                    value={stats.pendingGovernance} 
                    change="KYC, payouts & flags" 
                    trend="neutral"
                    isLoading={isStatsLoading}
                    href="/dashboard/system/compliance"
                />
            </div>

            {/* Live Activity Monitoring Map */}
            <section style={{ marginTop: '32px', marginBottom: '32px' }}>
                <h2 className={sharedStyles.sectionTitle}>Global Activity Map</h2>
                <div style={{ border: '1px solid var(--color-interface-border-subtle)', borderRadius: '12px', overflow: 'hidden', height: '500px', position: 'relative', background: 'var(--color-interface-surface-alt)' }}>
                    {isMounted ? (
                        <AdminMap />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                            Initializing Global Activity Tracking...
                        </div>
                    )}
                </div>
            </section>

            {/* Quick Actions Control Panel - Identical Layout to Organizer Dashboard (No Emojis) */}
            <section className={adminStyles.quickActions}>
                <h2 className={sharedStyles.sectionTitle}>Quick Actions</h2>
                <div className={adminStyles.actionsGrid}>
                    <button className={adminStyles.actionCard} onClick={() => router.push('/dashboard/system/registry')}>
                        <span className={adminStyles.actionLabel}>System Registry</span>
                    </button>
                    <button className={adminStyles.actionCard} onClick={() => router.push('/dashboard/system/compliance')}>
                        <span className={adminStyles.actionLabel}>Global Compliance</span>
                    </button>
                    <button className={adminStyles.actionCard} onClick={() => router.push('/dashboard/system/finance')}>
                        <span className={adminStyles.actionLabel}>Finance & Gateways</span>
                    </button>
                    <button className={adminStyles.actionCard} onClick={() => router.push('/dashboard/system/settings')}>
                        <span className={adminStyles.actionLabel}>Settings & Flags</span>
                    </button>
                    <button className={adminStyles.actionCard} onClick={() => router.push('/dashboard/system/operations')}>
                        <span className={adminStyles.actionLabel}>Jobs & Operations</span>
                    </button>
                    <button className={adminStyles.actionCard} onClick={() => router.push('/dashboard/system/proxy')}>
                        <span className={adminStyles.actionLabel}>Operational Proxy</span>
                    </button>
                </div>
            </section>

            {/* Consolidated Global Activity Log - Spanning Full Width Below */}
            <section className={adminStyles.activitySection}>
                <div className={adminStyles.sectionHeader}>
                    <h2 className={sharedStyles.sectionTitle} style={{ margin: 0 }}>Global Traceability & Operations Feed</h2>
                </div>

                <div className={adminStyles.activityFeed} style={{ marginTop: '16px' }}>
                    {isActivityLoading ? (
                        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5, fontSize: '13px' }}>
                            Syncing Global Audit Feed...
                        </div>
                    ) : activities.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.4, fontSize: '13px' }}>
                            No recent system actions logged.
                        </div>
                    ) : (
                        activities.map((act) => (
                            <div key={act.id} className={adminStyles.activityItem}>
                                <div className={adminStyles.activityIcon}>
                                    ⚙️
                                </div>
                                <div className={adminStyles.activityContent}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span className={adminStyles.activityText}>{act.action}</span>
                                        <span style={{ fontSize: '12.5px', opacity: 0.7, lineHeight: '1.4' }}>
                                            Triggered by {act.actor.name} ({act.actor.email}) on {act.targetType} target.
                                        </span>
                                    </div>
                                    <span className={adminStyles.activityTime}>
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
