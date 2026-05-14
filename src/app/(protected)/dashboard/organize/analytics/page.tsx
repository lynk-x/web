"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import PerformanceTable, { type PerformanceEvent } from '@/components/features/analytics/PerformanceTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatCurrency } from '@/utils/format';
import { exportToCSV } from '@/utils/export';
import { getErrorMessage } from '@/utils/error';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import ProductTour from '@/components/dashboard/ProductTour';
import { Tabs, TabsList, TabsTrigger } from '@/components/shared/Tabs';
import { createClient } from '@/utils/supabase/client';

export default function AnalyticsPage() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [timeRange, setTimeRange] = useState('30');
    const [statusFilter, setStatusFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('summary');
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<{ insights: PerformanceEvent[], timeSeries: any[] }>({
        insights: [],
        timeSeries: []
    });

    const fetchData = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const { data: metrics, error } = await supabase.rpc('get_organizer_performance_metrics', {
                p_account_id: activeAccount.id,
                p_days: parseInt(timeRange, 10)
            });

            if (error) throw error;
            setData(metrics || { insights: [], timeSeries: [] });
        } catch (err) {
            showToast(getErrorMessage(err) || 'Failed to sync performance data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, timeRange, supabase, showToast]);

    useEffect(() => {
        if (!isOrgLoading && activeAccount) {
            fetchData();
        }
    }, [isOrgLoading, activeAccount, fetchData]);

    const filteredInsights = (data?.insights || []).filter(item =>
        statusFilter === 'all' || item.status.toLowerCase() === statusFilter.toLowerCase()
    );

    const handleExport = () => {
        if (filteredInsights.length === 0) {
            showToast('No data to export.', 'warning');
            return;
        }
        showToast('Preparing performance report...', 'info');
        exportToCSV(
            filteredInsights.map(e => ({
                event: e.event,
                tickets_sold: e.ticketsSold,
                gross_revenue: e.totalRevenue,
                net_revenue: e.netRevenue,
                conversion_rate: e.conversionRate,
                status: e.status,
            })),
            `analytics_report_${timeRange}days`
        );
        showToast('Report downloaded.', 'success');
    };

    const stats = useMemo(() => {
        const insights = data?.insights || [];
        return {
            topEvent: insights.length > 0 
                ? insights.reduce((prev, curr) => (curr.ticketsSold > prev.ticketsSold ? curr : prev), insights[0]).event 
                : '—',
            totalSold: insights.reduce((sum, e) => sum + e.ticketsSold, 0),
            avgConversion: insights.length > 0
                ? (insights.reduce((sum, e) => {
                    const rate = parseFloat(e.conversionRate);
                    return sum + (isNaN(rate) ? 0 : rate);
                }, 0) / insights.length).toFixed(1) + '%'
                : '0%'
        };
    }, [data.insights]);

    return (
        <div className={adminStyles.container}>
            <PageHeader
                title="Analytics & Reports"
                subtitle={`Performance metrics for the last ${timeRange} days.`}
                actionLabel="Export CSV"
                onActionClick={handleExport}
                actionIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>}
            />

            <div className={adminStyles.statsGrid}>
                <StatCard
                    label="Peak Performer"
                    value={stats.topEvent}
                    isLoading={isLoading}
                    trend="positive"
                />
                <StatCard
                    label="Total Tickets Sold"
                    value={stats.totalSold.toLocaleString()}
                    isLoading={isLoading}
                    trend="positive"
                />
                <StatCard
                    label="Avg. Conversion"
                    value={stats.avgConversion}
                    isLoading={isLoading}
                />
            </div>

            <div className="tour-analytics-range" style={{ marginTop: 'var(--spacing-md)' }}>
                <TableToolbar searchPlaceholder="Filter by name..." searchValue="" onSearchChange={() => {}}>
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
                        style={{ width: 'auto', minWidth: '160px' }}
                    >
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="365">Last Year</option>
                    </select>
                </TableToolbar>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div style={{ marginTop: 'var(--spacing-md)' }}>
                    <TabsList>
                        <TabsTrigger value="summary">Performance Summary</TabsTrigger>
                        <TabsTrigger value="breakdown">Detailed Breakdown</TabsTrigger>
                    </TabsList>
                </div>
            </Tabs>

            {activeTab === 'summary' ? (
                <div className={adminStyles.subPageGridBalanced} style={{ marginTop: 'var(--spacing-md)' }}>
                    <div className={`${adminStyles.pageCard} tour-analytics-trend`}>
                        <h2 className={adminStyles.sectionTitle}>Revenue Trend</h2>
                        <div style={{ height: '300px', width: '100%', marginTop: '16px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.timeSeries}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-brand-primary)" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="var(--color-brand-primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-interface-outline)" vertical={false} />
                                    <XAxis dataKey="name" stroke="var(--color-utility-primaryText)" opacity={0.5} fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--color-utility-primaryText)" opacity={0.5} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `KES ${v / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--color-interface-surface)', border: '1px solid var(--color-interface-outline)', borderRadius: '8px', color: 'var(--color-utility-primaryText)' }}
                                        itemStyle={{ color: 'var(--color-brand-primary)' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="var(--color-brand-primary)" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className={adminStyles.pageCard}>
                        <h2 className={adminStyles.sectionTitle}>Volume by Event</h2>
                        <div style={{ height: '300px', width: '100%', marginTop: '16px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={filteredInsights}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-interface-outline)" vertical={false} />
                                    <XAxis
                                        dataKey="event"
                                        stroke="var(--color-utility-primaryText)"
                                        opacity={0.5}
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => val.length > 15 ? val.substring(0, 12) + '...' : val}
                                    />
                                    <YAxis stroke="var(--color-utility-primaryText)" opacity={0.5} fontSize={12} tickLine={false} axisLine={false} />
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
                <div className={adminStyles.pageCard} style={{ marginTop: 'var(--spacing-md)' }}>
                    <h2 className={adminStyles.sectionTitle}>Event Performance Matrix</h2>
                    <PerformanceTable data={filteredInsights} />
                </div>
            )}

            <ProductTour
                storageKey={activeAccount ? `hasSeenOrgAnalyticsJoyride_${activeAccount.id}` : 'hasSeenOrgAnalyticsJoyride_guest'}
                steps={[
                    { 
                        target: 'body', 
                        placement: 'center', 
                        title: 'Event Analytics', 
                        content: 'Welcome to your analytics command center. Track ticket sales, revenue trends, and conversion rates across your entire organization.', 
                        skipBeacon: true 
                    },
                    { 
                        target: '.tour-analytics-range', 
                        title: 'Time Range & Filters', 
                        content: 'Adjust the date range or filter by event status to analyze specific trends.' 
                    },
                    { 
                        target: '.tour-analytics-trend', 
                        title: 'Revenue Trends', 
                        content: 'Visualize your growth over time. Hover over data points for specific daily breakdowns.' 
                    }
                ]}
            />
        </div>
    );
}
