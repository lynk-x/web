"use client";

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import PerformanceTable, { type PerformanceEvent } from '@/components/features/analytics/PerformanceTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatCurrency } from '@/utils/format';
import { exportToCSV } from '@/utils/export';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import ProductTour from '@/components/dashboard/ProductTour';
import Tabs from '@/components/dashboard/Tabs';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';

interface AnalyticsResult {
  insights: PerformanceEvent[];
  timeSeries: { name: string; revenue: number; tickets: number }[];
}

export default function AnalyticsPage() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();

    const [timeRange, setTimeRange] = useState('30');
    const [statusFilter, setStatusFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('summary');

    const { data, isLoading } = useSupabaseQuery<AnalyticsResult>(
        ['analytics', activeAccount?.id, timeRange],
        async (supabase) => {
            if (!activeAccount) return { insights: [], timeSeries: [] };

            const { data: metrics, error } = await supabase.rpc('get_organizer_performance_metrics', {
                p_account_id: activeAccount.id,
                p_days: parseInt(timeRange, 10)
            });

            if (error) throw error;
            return metrics;
        },
        {
            enabled: !isOrgLoading && !!activeAccount,
            onError: (err: Error) => showToast(err.message || 'Failed to load performance metrics.', 'error'),
        } as any,
    );

    const insights = data?.insights ?? [];
    const timeSeriesData = data?.timeSeries ?? [];

    const filteredData = insights.filter(item =>
        statusFilter === 'all' || item.status.toLowerCase() === statusFilter.toLowerCase()
    );

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
                status: e.status,
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
                actionClassName="tour-analytics-export"
            />

            <div className={adminStyles.statsGrid} style={{ marginBottom: '24px' }}>
                <StatCard
                    label="Popularity Peak"
                    value={insights.length > 0 
                        ? insights.reduce((prev, curr) => (curr.ticketsSold > prev.ticketsSold ? curr : prev), insights[0]).event 
                        : '—'}
                    isLoading={isLoading}
                    trend="positive"
                />
                <StatCard
                    label="Tickets Sold"
                    value={insights.reduce((sum, e) => sum + e.ticketsSold, 0).toLocaleString()}
                    isLoading={isLoading}
                    trend="positive"
                />
                <StatCard
                    label="Avg. Conversion"
                    value={insights.length > 0
                        ? (insights.reduce((sum, e) => sum + parseFloat(e.conversionRate), 0) / insights.length).toFixed(1) + '%'
                        : '0%'}
                    isLoading={isLoading}
                    trend="neutral"
                />
            </div>

            <div style={{ marginTop: '24px' }}>
                <Tabs
                    options={[
                        { id: 'summary', label: 'Summary' },
                        { id: 'breakdown', label: 'Breakdown' },
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            </div>

            <div className="tour-analytics-range" style={{ marginTop: '16px' }}>
                <TableToolbar searchPlaceholder="Filter events..." searchValue="" onSearchChange={() => {}}>
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

            {activeTab === 'summary' ? (
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
                                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `KES ${v / 1000}k`} />
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
            ) : (
                <div className={adminStyles.pageCard} style={{ marginTop: '24px' }}>
                    <h2 className={adminStyles.sectionTitle} style={{ marginBottom: '16px' }}>Event Performance Breakdown</h2>
                    <PerformanceTable data={filteredData} />
                </div>
            )}

            <ProductTour
                storageKey={activeAccount ? `hasSeenOrgAnalyticsJoyride_${activeAccount.id}` : 'hasSeenOrgAnalyticsJoyride_guest'}
                steps={[
                    { 
                        target: 'body', 
                        placement: 'center', 
                        title: 'Event Analytics', 
                        content: 'Welcome to your analytics command center. Here you can track everything from ticket sales to conversion rates across your entire organization.', 
                        skipBeacon: true 
                    },
                    { 
                        target: '.tour-analytics-range', 
                        title: 'Time Range & Filters', 
                        content: 'Adjust the date range or filter by event status to analyze specific trends over the last week, month or year.' 
                    },
                    { 
                        target: '.tour-analytics-trend', 
                        title: 'Performance Trend', 
                        content: 'This chart visualizes your gross revenue growth. Hover over the data points for specific daily breakdowns.' 
                    },
                    {
                        target: '.tour-analytics-export',
                        title: 'Export Reports',
                        content: 'Need to present this data? Click here to download a full CSV report of your current performance metrics.'
                    }
                ]}
            />
        </div>
    );
}
