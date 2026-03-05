"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './page.module.css';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import PerformanceTable, { type PerformanceEvent } from '@/components/organize/PerformanceTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency } from '@/utils/format';
import { exportToCSV } from '@/utils/export';
import StatCard from '@/components/dashboard/StatCard';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';

// timeSeriesData is now fetched from the database — see fetchAnalytics below

export default function AnalyticsPage() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [timeRange, setTimeRange] = useState('30');
    const [statusFilter, setStatusFilter] = useState('all');
    const [detailedInsights, setDetailedInsights] = useState<PerformanceEvent[]>([]);
    // Real daily time series fetched from transactions
    const [timeSeriesData, setTimeSeriesData] = useState<{ name: string; revenue: number; tickets: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [analyticsStats, setAnalyticsStats] = useState<any>([
        { label: 'Total Revenue', value: null, isPositive: true },
        { label: 'Tickets Sold', value: null, isPositive: true },
        { label: 'Avg. Conversion', value: null, isPositive: false },
    ]);

    const fetchAnalytics = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            // ── Event-level performance ─────────────────────────────────────
            const { data: eventsData, error: evErr } = await supabase
                .from('events')
                .select(`id, title, status, ticket_tiers(price, capacity, tickets_sold)`)
                .eq('account_id', activeAccount.id);

            if (evErr) throw evErr;

            let totalAccRevenue = 0;
            let totalAccTicketsSold = 0;
            let totalAccCapacity = 0;

            const mappedInsights: PerformanceEvent[] = (eventsData || []).map((eventData: any) => {
                let eventRevenue = 0;
                let eventSold = 0;
                let eventTotalCapacity = 0;

                (eventData.ticket_tiers || []).forEach((tier: any) => {
                    eventSold += tier.tickets_sold || 0;
                    eventRevenue += (tier.tickets_sold || 0) * (tier.price || 0);
                    eventTotalCapacity += tier.capacity || 0;
                });

                totalAccRevenue += eventRevenue;
                totalAccTicketsSold += eventSold;
                totalAccCapacity += eventTotalCapacity;

                return {
                    id: eventData.id,
                    event: eventData.title,
                    ticketsSold: eventSold,
                    totalRevenue: eventRevenue,
                    conversionRate: eventTotalCapacity > 0 ? ((eventSold / eventTotalCapacity) * 100).toFixed(1) + '%' : 'N/A',
                    status: eventData.status
                };
            });

            setDetailedInsights(mappedInsights);

            const avgConversion = totalAccCapacity > 0
                ? ((totalAccTicketsSold / totalAccCapacity) * 100).toFixed(1) + '%'
                : '0%';

            setAnalyticsStats([
                { label: 'Total Revenue', value: formatCurrency(totalAccRevenue), isPositive: true },
                { label: 'Tickets Sold', value: totalAccTicketsSold.toString(), isPositive: true },
                { label: 'Avg. Conversion', value: avgConversion, isPositive: false },
            ]);

            // ── Daily revenue time series (last N days) ─────────────────────
            const since = new Date();
            since.setDate(since.getDate() - parseInt(timeRange, 10));

            const { data: eventIds } = await supabase
                .from('events')
                .select('id')
                .eq('account_id', activeAccount.id);

            const ids = (eventIds || []).map((e: any) => e.id);

            if (ids.length > 0) {
                const { data: txData, error: txErr } = await supabase
                    .from('transactions')
                    .select('amount, created_at')
                    .in('event_id', ids)
                    .eq('category', 'incoming')
                    .eq('status', 'completed')
                    .gte('created_at', since.toISOString());

                if (txErr) throw txErr;

                // Group by day
                const byDay: Record<string, number> = {};
                (txData || []).forEach((tx: any) => {
                    const day = new Date(tx.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' });
                    byDay[day] = (byDay[day] || 0) + tx.amount;
                });

                // Build sorted array for the chart
                const series = Object.entries(byDay)
                    .map(([name, revenue]) => ({ name, revenue, tickets: 0 }))
                    .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

                setTimeSeriesData(series.length > 0 ? series : []);
            }

        } catch (err: any) {
            showToast(err.message || 'Failed to load performance metrics.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast, timeRange]);

    useEffect(() => {
        if (!isOrgLoading && activeAccount) {
            fetchAnalytics();
        } else if (!isOrgLoading && !activeAccount) {
            // No account — we stop loading but cards will show 0 if they remain at their initial state
            // and we update them here to be empty values rather than '...'
            setAnalyticsStats([
                { label: 'Total Revenue', value: formatCurrency(0), isPositive: true },
                { label: 'Tickets Sold', value: '0', isPositive: true },
                { label: 'Avg. Conversion', value: '0%', isPositive: false },
            ]);
            setIsLoading(false);
            setDetailedInsights([]);
        }
    }, [isOrgLoading, activeAccount, fetchAnalytics]);

    // Filtered data for comparison chart
    const filteredData = detailedInsights.filter(item => {
        const matchesStatus = statusFilter === 'all' || item.status.toLowerCase() === statusFilter.toLowerCase();
        return matchesStatus;
    });

    const handleExport = () => {
        if (filteredData.length === 0) {
            showToast('No data to export.', 'warning');
            return;
        }
        showToast('Preparing analytics report...', 'info');
        exportToCSV(
            filteredData.map(e => ({
                event: e.event,
                tickets_sold: e.ticketsSold,
                total_revenue: e.totalRevenue,
                conversion_rate: e.conversionRate,
                status: e.status
            })),
            `analytics_report_${timeRange}days`
        );
        showToast('Report downloaded.', 'success');
    };

    return (
        <div className={styles.dashboardPage}>
            <header className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Analytics & Reports</h1>
                    <p className={styles.pageSubtitle}>Visual performance metrics for the last {timeRange} days.</p>
                </div>
                <button className={styles.primaryBtn} onClick={handleExport}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export Report
                </button>
            </header>

            {/* Toolbar for Chart Filtering */}
            <TableToolbar>
                <div className={styles.toolbarContainer}>
                    {['all', 'active', 'past', 'draft'].map((status) => {
                        const isActive = statusFilter === status;
                        return (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        );
                    })}
                </div>

                <div className={styles.filterGroup}>
                    <select
                        className={styles.filterSelect}
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                    >
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="365">Last Year</option>
                    </select>
                </div>
            </TableToolbar>

            {/* Stats Overview */}
            <div className={sharedStyles.statsGrid}>
                {analyticsStats.map((stat: any, index: number) => (
                    <StatCard
                        key={index}
                        label={stat.label}
                        value={stat.value}
                        isLoading={isLoading}
                        trend={stat.label === 'Total Revenue' ? 'positive' : 'neutral'}
                    />
                ))}
            </div>

            {isLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Aggregating Live Event Statistics...</div>
            ) : detailedInsights.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>No event data available to analyze yet.</div>
            ) : (
                <>

                    {/* Charts Grid */}
                    <div className={styles.chartsGrid}>
                        {/* Revenue & Tickets Trend */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <h2 className={styles.chartTitle}>Overall Performance Trend</h2>
                            </div>
                            <div className={styles.chartContainer}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={timeSeriesData}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#20f928" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#20f928" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `KES ${value / 1000}k`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                            itemStyle={{ color: '#20f928' }}
                                        />
                                        <Area type="monotone" dataKey="revenue" stroke="#20f928" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Event Comparison */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <h2 className={styles.chartTitle}>Ticket Sales by Event</h2>
                            </div>
                            <div className={styles.chartContainer}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={filteredData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis
                                            dataKey="event"
                                            stroke="rgba(255,255,255,0.3)"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => val.length > 15 ? val.substring(0, 12) + '...' : val}
                                        />
                                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="ticketsSold" fill="#20f928" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Per-event performance table */}
                    <div className={styles.chartCard} style={{ marginTop: '8px' }}>
                        <div className={styles.chartHeader}>
                            <h2 className={styles.chartTitle}>Event Performance Breakdown</h2>
                        </div>
                        <PerformanceTable data={filteredData} />
                    </div>
                </>
            )}
        </div>
    );
}
