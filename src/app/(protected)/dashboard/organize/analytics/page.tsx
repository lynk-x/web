"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import PerformanceTable, { type PerformanceEvent } from '@/components/features/analytics/PerformanceTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency } from '@/utils/format';
import { exportToCSV } from '@/utils/export';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import ProductTour from '@/components/dashboard/ProductTour';

export default function AnalyticsPage() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [timeRange, setTimeRange] = useState('30');
    const [statusFilter, setStatusFilter] = useState('all');
    const [detailedInsights, setDetailedInsights] = useState<PerformanceEvent[]>([]);
    const [timeSeriesData, setTimeSeriesData] = useState<{ name: string; revenue: number; tickets: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);



    const fetchAnalytics = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
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

                const eventRev = eventRevenue;
                const netRev = eventRev * 0.95;

                return {
                    id: eventData.id,
                    event: eventData.title,
                    ticketsSold: eventSold,
                    totalRevenue: eventRev,
                    netRevenue: netRev,
                    conversionRate: eventTotalCapacity > 0 ? ((eventSold / eventTotalCapacity) * 100).toFixed(1) + '%' : 'N/A',
                    status: eventData.status
                };
            });

            setDetailedInsights(mappedInsights);



            const since = new Date();
            since.setDate(since.getDate() - parseInt(timeRange, 10));

            const { data: eventIds } = await supabase
                .from('events')
                .select('id')
                .eq('account_id', activeAccount.id);

            const ids = (eventIds || []).map((e: any) => e.id);

            if (ids.length > 0) {
                const { data: txData, error: txErr } = await supabase
                    .schema('transactions')
                    .from('transactions')
                    .select('amount, created_at')
                    .in('event_id', ids)
                    .eq('category', 'incoming')
                    .eq('status', 'completed')
                    .gte('created_at', since.toISOString());

                if (txErr) throw txErr;

                const byDay: Record<string, number> = {};
                (txData || []).forEach((tx: any) => {
                    const day = new Date(tx.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' });
                    byDay[day] = (byDay[day] || 0) + tx.amount;
                });

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

            setIsLoading(false);
            setDetailedInsights([]);
        }
    }, [isOrgLoading, activeAccount, fetchAnalytics]);

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
        <div className={adminStyles.container}>
            <PageHeader
                title="Analytics & Reports"
                subtitle={`Performance metrics aggregated across your organization for the last ${timeRange} days.`}
                actionLabel="Export Report"
                onActionClick={handleExport}
                actionIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>}
            />

            <div className={adminStyles.statsGrid} style={{ marginBottom: '24px' }}>
                <StatCard 
                    label="Gross Revenue" 
                    value={formatCurrency(detailedInsights.reduce((sum, e) => sum + e.totalRevenue, 0), activeAccount?.wallet_currency)} 
                    isLoading={isLoading}
                />
                <StatCard 
                    label="Estimated Net" 
                    value={formatCurrency(detailedInsights.reduce((sum, e) => sum + e.netRevenue, 0), activeAccount?.wallet_currency)} 
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard 
                    label="Tickets Sold" 
                    value={detailedInsights.reduce((sum, e) => sum + e.ticketsSold, 0)} 
                    isLoading={isLoading}
                />
            </div>

            <div className="tour-analytics-range">
                <TableToolbar
                    searchPlaceholder="Filter events..."
                searchValue=""
                onSearchChange={() => { }}
            >
                <div className={adminStyles.filterGroup}>
                    {['all', 'active', 'past', 'draft'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`${adminStyles.chip} ${statusFilter === status ? adminStyles.chipActive : ''}`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>

                <select
                    className={adminStyles.select}
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    style={{ width: 'auto' }}
                >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="365">Last Year</option>
                    </select>
                </TableToolbar>
            </div>



            <div className={adminStyles.subPageGridBalanced} style={{ marginTop: '24px' }}>
                <div className={`${adminStyles.pageCard} tour-analytics-trend`}>
                    <h2 className={adminStyles.sectionTitle}>Performance Trend</h2>
                    <div style={{ height: '300px', width: '100%', marginTop: '16px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeSeriesData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-brand-primary)" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="var(--color-brand-primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `KES ${value / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--color-interface-surface)', border: '1px solid var(--color-interface-outline)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--color-brand-primary)' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="var(--color-brand-primary)" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={adminStyles.pageCard}>
                    <h2 className={adminStyles.sectionTitle}>Ticket Sales by Event</h2>
                    <div style={{ height: '300px', width: '100%', marginTop: '16px' }}>
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
                                    contentStyle={{ backgroundColor: 'var(--color-interface-surface)', border: '1px solid var(--color-interface-outline)', borderRadius: '8px' }}
                                />
                                <Bar dataKey="ticketsSold" fill="var(--color-brand-primary)" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className={adminStyles.pageCard} style={{ marginTop: '24px' }}>
                <h2 className={adminStyles.sectionTitle} style={{ marginBottom: '16px' }}>Event Performance Breakdown</h2>
                <PerformanceTable data={filteredData} />
            </div>
            <ProductTour
                storageKey={activeAccount ? `hasSeenOrgAnalyticsJoyride_${activeAccount.id}` : 'hasSeenOrgAnalyticsJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Event Analytics',
                        content: 'Dive deep into your event performance and ticket sales.',
                        disableBeacon: true,
                    },
                    {
                        target: '.tour-analytics-range',
                        title: 'Time Range & Filters',
                        content: 'Adjust the date range or status to see specific historical performance trends.',
                    },
                    {
                        target: '.tour-analytics-trend',
                        title: 'Performance Trend',
                        content: 'Visualize your revenue and sales growth over time in this chart.',
                    }
                ]}
            />
        </div>
    );
}
