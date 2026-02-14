"use client";

import React from 'react';
import styles from './page.module.css';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const data = [
    { name: 'Mon', revenue: 4000 },
    { name: 'Tue', revenue: 3000 },
    { name: 'Wed', revenue: 2000 },
    { name: 'Thu', revenue: 2780 },
    { name: 'Fri', revenue: 1890 },
    { name: 'Sat', revenue: 2390 },
    { name: 'Sun', revenue: 3490 },
];

const ticketData = [
    { name: 'VIP', value: 400 },
    { name: 'Regular', value: 300 },
    { name: 'Early Bird', value: 300 },
    { name: 'Student', value: 200 },
];

const COLORS = ['#20F928', '#0088FE', '#FFBB28', '#FF8042'];

export default function AnalyticsPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Analytics & Reports</h1>
                <p className={styles.subtitle}>Track your event performance and sales trends.</p>
            </header>

            <div className={styles.grid}>
                {/* Revenue Chart */}
                <div className={styles.chartCard}>
                    <h2 className={styles.chartTitle}>Revenue Overview (Last 7 Days)</h2>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={data}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#20F928" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#20F928" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                                <YAxis stroke="rgba(255,255,255,0.5)" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333' }}
                                    itemStyle={{ color: '#20F928' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#20F928" fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Ticket Distribution */}
                <div className={styles.chartCard}>
                    <h2 className={styles.chartTitle}>Ticket Distribution</h2>
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
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <h3>Total Revenue</h3>
                    <p className={styles.summaryValue}>KES 1,240,500</p>
                </div>
                <div className={styles.summaryCard}>
                    <h3>Tickets Sold</h3>
                    <p className={styles.summaryValue}>1,200</p>
                </div>
                <div className={styles.summaryCard}>
                    <h3>Avg. Ticket Price</h3>
                    <p className={styles.summaryValue}>KES 1,033</p>
                </div>
                <div className={styles.summaryCard}>
                    <h3>Page Views</h3>
                    <p className={styles.summaryValue}>45.2k</p>
                </div>
            </div>
        </div>
    );
}
