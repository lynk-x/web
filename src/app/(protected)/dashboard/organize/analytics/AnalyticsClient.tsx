"use client";

import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import PerformanceTable, { type PerformanceEvent } from '@/components/features/analytics/PerformanceTable';
import FilterChips from '@/components/shared/FilterChips';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { exportToCSV } from '@/utils/export';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import ProductTour from '@/components/dashboard/ProductTour';
import { Tabs, TabsList, TabsTrigger } from '@/components/shared/Tabs';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';

interface TimeSeriesItem {
    name: string;
    revenue: number;
}

interface AnalyticsData {
    insights: PerformanceEvent[];
    timeSeries: TimeSeriesItem[];
}

export default function AnalyticsClient() {
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();

    const [timeRange, setTimeRange] = useState('30');
    const [statusFilter, setStatusFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('summary');
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch metrics dynamically using our pre-hydrated React Query hook!
    const { data: rawData, isLoading } = useSupabaseQuery<AnalyticsData>(
        ['organizer-performance-metrics', activeAccount?.id, timeRange],
        async (supabase) => {
            if (!activeAccount?.id) return { insights: [], timeSeries: [] };
            const { data: metrics, error } = await supabase.schema('api').rpc('get_organizer_performance_metrics', {
                p_account_id: activeAccount.id,
                p_days: parseInt(timeRange, 10)
            });
            if (error) throw error;
            return (metrics as AnalyticsData | null) || { insights: [], timeSeries: [] };
        },
        {
            enabled: !!activeAccount?.id,
        }
    );

    const data = useMemo<AnalyticsData>(() => rawData || { insights: [], timeSeries: [] }, [rawData]);

    const filteredInsights = useMemo(() => {
        return (data.insights || []).filter(item => {
            const matchesStatus = statusFilter === 'all' || item.status.toLowerCase() === statusFilter.toLowerCase();
            const matchesSearch = item.event.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [data.insights, statusFilter, searchTerm]);

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
                status: e.status,
            })),
            `analytics_report_${timeRange}days`
        );
        showToast('Report downloaded.', 'success');
    };

    const stats = useMemo(() => {
        const insights = data.insights || [];
        return {
            totalEvents: insights.length,
            totalSold: insights.reduce((sum, e) => sum + e.ticketsSold, 0),
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
                    label="Total Events"
                    value={stats.totalEvents.toLocaleString()}
                    isLoading={isLoading}
                    trend="positive"
                />
                <StatCard
                    label="Total Tickets Sold"
                    value={stats.totalSold.toLocaleString()}
                    isLoading={isLoading}
                    trend="positive"
                />
            </div>

            <div className="tour-analytics-range" style={{ marginTop: 'var(--spacing-md)' }}>
                <TableToolbar searchPlaceholder="Filter by name..." searchValue={searchTerm} onSearchChange={setSearchTerm}>
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

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                        <TabsList>
                            <TabsTrigger value="summary">Performance Summary</TabsTrigger>
                            <TabsTrigger value="breakdown">Detailed Breakdown</TabsTrigger>
                        </TabsList>
                        <FilterChips
                            options={[
                                { value: 'all', label: 'All' },
                                { value: 'active', label: 'Active' },
                                { value: 'past', label: 'Past' },
                                { value: 'draft', label: 'Draft' },
                            ]}
                            currentValue={statusFilter}
                            onChange={setStatusFilter}
                        />
                    </div>
                </Tabs>
            </div>

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
