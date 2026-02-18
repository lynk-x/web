"use client";

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';

// Mock data (same as before for now)
const weeklyData = [
    { name: 'Mon', revenue: 4000, visits: 2400 },
    { name: 'Tue', revenue: 3000, visits: 1398 },
    { name: 'Wed', revenue: 2000, visits: 9800 },
    { name: 'Thu', revenue: 2780, visits: 3908 },
    { name: 'Fri', revenue: 1890, visits: 4800 },
    { name: 'Sat', revenue: 2390, visits: 3800 },
    { name: 'Sun', revenue: 3490, visits: 4300 },
];

const monthlyData = [
    { name: 'Week 1', revenue: 15000, visits: 9000 },
    { name: 'Week 2', revenue: 12000, visits: 8500 },
    { name: 'Week 3', revenue: 18000, visits: 11000 },
    { name: 'Week 4', revenue: 14000, visits: 9500 },
];

const ticketData = [
    { name: 'VIP', value: 400 },
    { name: 'Regular', value: 300 },
    { name: 'Early Bird', value: 300 },
    { name: 'Student', value: 200 },
];

// Mock event comparison data (maybe less relevant for single event, but keeping for now or replacing with something else)
const salesChannelsData = [
    { name: 'Direct', sales: 450 },
    { name: 'Social', sales: 300 },
    { name: 'Email', sales: 200 },
    { name: 'Affiliate', sales: 150 },
];

const COLORS = ['#20F928', '#0088FE', '#FFBB28', '#FF8042'];

export default function EventInsightsPage({ params }: { params: { id: string } }) {
    const [dateRange, setDateRange] = useState('7d');
    const [chartData, setChartData] = useState(weeklyData);

    // Decode the ID to show a readable name if strictly needed, or just use a mock lookup
    // For this demo, we'll assume ID "1" is "Nairobi Tech Summit 2024"
    const eventName = params.id === '1' ? 'Nairobi Tech Summit 2024' : 'Event Insights';

    const handleDateRangeChange = (range: string) => {
        setDateRange(range);
        if (range === '7d') setChartData(weeklyData);
        if (range === '30d') setChartData(monthlyData);
    };

    const handleExport = () => {
        alert("Exporting data for " + eventName);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/dashboard/analytics" className={styles.backLink}>
                        ← Back to Analytics
                    </Link>
                    <h1 className={styles.title}>{eventName}</h1>
                    <p className={styles.subtitle}>Detailed performance metrics</p>
                </div>
                <div className={styles.actions}>
                    <div className={styles.dateFilter}>
                        <button
                            className={`${styles.filterBtn} ${dateRange === '7d' ? styles.active : ''}`}
                            onClick={() => handleDateRangeChange('7d')}
                        >Last 7 Days</button>
                        <button
                            className={`${styles.filterBtn} ${dateRange === '30d' ? styles.active : ''}`}
                            onClick={() => handleDateRangeChange('30d')}
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

            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <h3>Total Revenue</h3>
                    <p className={styles.summaryValue}>KES 1,240,500</p>
                    <span className={`${styles.trend} ${styles.positive}`}>↑ 12% vs last period</span>
                </div>
                <div className={styles.summaryCard}>
                    <h3>Tickets Sold</h3>
                    <p className={styles.summaryValue}>1,200</p>
                    <span className={`${styles.trend} ${styles.positive}`}>↑ 8% vs last period</span>
                </div>
                <div className={styles.summaryCard}>
                    <h3>Avg. Ticket Price</h3>
                    <p className={styles.summaryValue}>KES 1,033</p>
                    <span className={`${styles.trend} ${styles.neutral}`}>- 0% vs last period</span>
                </div>
                <div className={styles.summaryCard}>
                    <h3>Page Views</h3>
                    <p className={styles.summaryValue}>45.2k</p>
                    <span className={`${styles.trend} ${styles.negative}`}>↓ 2% vs last period</span>
                </div>
            </div>

            <div className={styles.grid}>
                {/* Revenue Chart */}
                <div className={`${styles.chartCard} ${styles.fullWidth}`}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.chartTitle}>Revenue Trends</h2>
                    </div>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#20F928" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#20F928" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333' }}
                                    itemStyle={{ color: '#20F928' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#20F928" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sales Channels Bar Chart */}
                <div className={styles.chartCard}>
                    <h2 className={styles.chartTitle}>Sales Channels</h2>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesChannelsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} interval={0} />
                                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333' }}
                                />
                                <Bar dataKey="sales" fill="#20F928" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Ticket Distribution Pie Chart */}
                <div className={styles.chartCard}>
                    <h2 className={styles.chartTitle}>Ticket Types Sold</h2>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={ticketData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {ticketData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
