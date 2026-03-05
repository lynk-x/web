"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { exportToCSV } from '@/utils/export';
import { formatCurrency } from '@/utils/format';
import StatCard from '@/components/dashboard/StatCard';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';

const COLORS = ['#20F928', '#0088FE', '#FFBB28', '#FF8042', '#a855f7'];

interface DayPoint { name: string; revenue: number; }
interface TierSlice { name: string; value: number; }

/**
 * Per-event analytics detail page.
 * Fetches real data from Supabase:
 *  - Event metadata (title, starts_at, status)
 *  - Ticket tier breakdown (name, tickets_sold, capacity, price)
 *  - Revenue time series from the transactions table
 */
export default function EventInsightsPage() {
    const { id } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState('7d');

    // ── Derived state ───────────────────────────────────────────────────────
    const [eventTitle, setEventTitle] = useState('Event Insights');
    const [stats, setStats] = useState<any>({
        totalRevenue: null,
        currency: 'KES',
        ticketsSold: null,
        avgTicketPrice: null,
        totalCapacity: null,
    });
    const [tierData, setTierData] = useState<TierSlice[]>([]);
    const [timeSeriesData, setTimeSeriesData] = useState<DayPoint[]>([]);

    // ── Fetch ───────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            // 1. Event metadata + tier breakdown
            const { data: eventData, error: evErr } = await supabase
                .from('events')
                .select(`
                    id, title, starts_at, status,
                    ticket_tiers(name, price, capacity, tickets_sold)
                `)
                .eq('id', id)
                .maybeSingle();

            if (evErr) throw evErr;

            if (eventData) {
                setEventTitle(eventData.title);

                const tiers = eventData.ticket_tiers || [];
                let totalSold = 0;
                let totalRevenue = 0;
                let totalCapacity = 0;

                const slices: TierSlice[] = tiers.map((t: any) => {
                    const sold = t.tickets_sold || 0;
                    totalSold += sold;
                    totalRevenue += sold * (t.price || 0);
                    totalCapacity += t.capacity || 0;
                    return { name: t.name, value: sold };
                });

                setTierData(slices.filter(s => s.value > 0));
                setStats({
                    totalRevenue,
                    currency: 'KES',
                    ticketsSold: totalSold,
                    avgTicketPrice: totalSold > 0 ? totalRevenue / totalSold : 0,
                    totalCapacity,
                });
            }

            // 2. Revenue time series (last N days of completed transactions for this event)
            const days = dateRange === '7d' ? 7 : 30;
            const since = new Date();
            since.setDate(since.getDate() - days);

            const { data: txData, error: txErr } = await supabase
                .from('transactions')
                .select('amount, created_at')
                .eq('event_id', id)
                .eq('status', 'completed')
                .eq('category', 'incoming')
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: true });

            if (txErr) throw txErr;

            // Group by day label
            const byDay: Record<string, number> = {};
            (txData || []).forEach((tx: any) => {
                const label = new Date(tx.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' });
                byDay[label] = (byDay[label] || 0) + Number(tx.amount);
            });

            setTimeSeriesData(Object.entries(byDay).map(([name, revenue]) => ({ name, revenue })));

        } catch (err: any) {
            showToast(err.message || 'Failed to load event analytics.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, supabase, dateRange, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Handlers ────────────────────────────────────────────────────────────
    const handleExport = () => {
        showToast('Preparing export...', 'info');
        exportToCSV(
            tierData.map(t => ({ tier: t.name, tickets_sold: t.value })),
            `event_analytics_${id}`
        );
        showToast('Export complete.', 'success');
    };

    // ── Render ──────────────────────────────────────────────────────────────
    // Removed top-level loading return to allow StatCards to show '...' state
    // if (isLoading) {
    //     return (
    //         <div className={styles.container} style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
    //             Loading event analytics...
    //         </div>
    //     );
    // }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/dashboard/organize/analytics" className={styles.backLink}>
                        ← Back to Analytics
                    </Link>
                    <h1 className={styles.title}>{eventTitle}</h1>
                    <p className={styles.subtitle}>Detailed performance metrics</p>
                </div>
                <div className={styles.actions}>
                    <div className={styles.dateFilter}>
                        <button
                            className={`${styles.filterBtn} ${dateRange === '7d' ? styles.active : ''}`}
                            onClick={() => setDateRange('7d')}
                        >Last 7 Days</button>
                        <button
                            className={`${styles.filterBtn} ${dateRange === '30d' ? styles.active : ''}`}
                            onClick={() => setDateRange('30d')}
                        >Last 30 Days</button>
                    </div>
                    <button className={styles.exportBtn} onClick={handleExport}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export
                    </button>
                </div>
            </header>

            {/* KPI cards */}
            <div className={sharedStyles.statsGrid}>
                <StatCard
                    label="Total Revenue"
                    value={stats.totalRevenue !== null ? formatCurrency(stats.totalRevenue, stats.currency) : null}
                    change="Gross from ticket sales"
                    trend="neutral"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Tickets Sold"
                    value={stats.ticketsSold !== null ? stats.ticketsSold.toLocaleString() : null}
                    change={stats.totalCapacity !== null ? (stats.totalCapacity > 0 ? `of ${stats.totalCapacity.toLocaleString()} capacity` : 'No capacity set') : '...'}
                    trend="neutral"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Avg. Ticket Price"
                    value={stats.avgTicketPrice !== null ? formatCurrency(stats.avgTicketPrice, stats.currency) : null}
                    change="Across all tiers"
                    trend="neutral"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Sell-through Rate"
                    value={stats.totalCapacity !== null && stats.ticketsSold !== null ? (stats.totalCapacity > 0 ? ((stats.ticketsSold / stats.totalCapacity) * 100).toFixed(1) + '%' : 'N/A') : null}
                    change="Capacity utilisation"
                    trend={stats.ticketsSold / stats.totalCapacity > 0.5 ? 'positive' : 'neutral'}
                    isLoading={isLoading}
                />
            </div>

            <div className={styles.grid}>
                {/* Revenue Trend Chart */}
                <div className={`${styles.chartCard} ${styles.fullWidth}`}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.chartTitle}>Revenue Trend</h2>
                    </div>
                    {timeSeriesData.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
                            No completed transactions in this date range.
                        </div>
                    ) : (
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#20F928" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#20F928" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333' }}
                                        itemStyle={{ color: '#20F928' }}
                                        formatter={(v: number | undefined) => formatCurrency(v ?? 0, stats.currency)}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#20F928" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Tier Breakdown Bar Chart */}
                <div className={styles.chartCard}>
                    <h2 className={styles.chartTitle}>Tickets Sold by Tier</h2>
                    {tierData.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>No ticket sales yet.</div>
                    ) : (
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={tierData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} interval={0} />
                                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333' }}
                                    />
                                    <Bar dataKey="value" name="Tickets Sold" fill="#20F928" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Ticket Tier Distribution Pie */}
                <div className={styles.chartCard}>
                    <h2 className={styles.chartTitle}>Ticket Type Distribution</h2>
                    {tierData.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>No ticket sales yet.</div>
                    ) : (
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={tierData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {tierData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333' }} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
