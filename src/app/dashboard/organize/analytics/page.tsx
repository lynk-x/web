"use client";

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import PerformanceTable, { PerformanceEvent } from '@/components/organize/PerformanceTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';

// Extended mock data to demonstrate pagination
const detailedInsights: PerformanceEvent[] = [
    { id: 1, event: 'Nairobi Tech Summit 2024', sold: 482, revenue: 124500, conversion: '3.2%', status: 'Active' },
    { id: 2, event: 'AfroBeats Festival', sold: 340, revenue: 85000, conversion: '2.8%', status: 'Active' },
    { id: 3, event: 'Startup Pitch Night', sold: 0, revenue: 0, conversion: '0%', status: 'Draft' },
    { id: 4, event: 'Art & Wine Mixer', sold: 85, revenue: 21250, conversion: '4.1%', status: 'Past' },
    { id: 5, event: 'Comedy Night Special', sold: 200, revenue: 50000, conversion: '5.0%', status: 'Active' },
    { id: 6, event: 'Jazz in the Park', sold: 150, revenue: 37500, conversion: '2.5%', status: 'Past' },
    { id: 7, event: 'Product Launch: Alpha', sold: 50, revenue: 0, conversion: 'N/A', status: 'Draft' },
    { id: 8, event: 'Charity Gala Dinner', sold: 300, revenue: 300000, conversion: '4.8%', status: 'Active' },
];

// Mock data for trends
const timeSeriesData = [
    { name: 'Week 1', revenue: 45000, tickets: 120 },
    { name: 'Week 2', revenue: 52000, tickets: 145 },
    { name: 'Week 3', revenue: 38000, tickets: 95 },
    { name: 'Week 4', revenue: 65000, tickets: 180 },
    { name: 'Week 5', revenue: 85000, tickets: 230 },
    { name: 'Week 6', revenue: 78000, tickets: 210 },
];

const analyticsStats = [
    { label: 'Total Revenue', value: 'KES 1,245,600', change: '+12.5%', isPositive: true },
    { label: 'Tickets Sold', value: '4,820', change: '+8.1%', isPositive: true },
    { label: 'Avg. Conversion', value: '4.2%', change: '-0.5%', isPositive: false },
    { label: 'Page Views', value: '45.2k', change: '+24.3%', isPositive: true },
];

export default function AnalyticsPage() {
    const { showToast } = useToast();
    const [timeRange, setTimeRange] = useState('30');
    const [statusFilter, setStatusFilter] = useState('all');

    // Filtered data for comparison chart
    const filteredData = detailedInsights.filter(item => {
        const matchesStatus = statusFilter === 'all' || item.status.toLowerCase() === statusFilter.toLowerCase();
        return matchesStatus;
    });

    const handleExport = () => {
        showToast('Preparing your analytics report...', 'info');
        // Mock export functionality
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Event,Revenue,Tickets Sold\n"
            + filteredData.map(e => `${e.event},${e.revenue},${e.sold}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `analytics_report_${timeRange}days.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Report downloaded successfully.', 'success');
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
            <div className={styles.statsGrid}>
                {analyticsStats.map((stat, index) => (
                    <div key={index} className={styles.statCard}>
                        <span className={styles.statLabel}>{stat.label}</span>
                        <div className={styles.statValue}>{stat.value}</div>
                        <div className={`${styles.statChange} ${stat.isPositive ? styles.positive : styles.negative}`}>
                            {stat.isPositive ? '↑' : '↓'} {stat.change}
                            <span style={{ opacity: 0.6, color: 'var(--color-utility-primaryText)', marginLeft: '4px', fontSize: '12px' }}> vs last period</span>
                        </div>
                    </div>
                ))}
            </div>

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
                                <Bar dataKey="sold" fill="#20f928" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
