"use client";

import styles from './page.module.css';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Mock Data for Charts
const performanceData = [
    { name: 'Mon', impressions: 4000, clicks: 240 },
    { name: 'Tue', impressions: 3000, clicks: 139 },
    { name: 'Wed', impressions: 2000, clicks: 980 },
    { name: 'Thu', impressions: 2780, clicks: 390 },
    { name: 'Fri', impressions: 1890, clicks: 480 },
    { name: 'Sat', impressions: 2390, clicks: 380 },
    { name: 'Sun', impressions: 3490, clicks: 430 },
];

export default function AnalyticsPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Analytics</h1>
                <button className={styles.dateRangeBtn}>
                    Last 7 Days ▼
                </button>
            </header>

            {/* Overview Cards */}
            <div className={styles.overviewCards}>
                <div className={styles.card}>
                    <span className={styles.cardTitle}>Total Impressions</span>
                    <span className={styles.cardValue}>45.2k</span>
                    <span className={`${styles.cardChange} ${styles.positive}`}>+12.5%</span>
                </div>
                <div className={styles.card}>
                    <span className={styles.cardTitle}>Total Clicks</span>
                    <span className={styles.cardValue}>1,890</span>
                    <span className={`${styles.cardChange} ${styles.positive}`}>+8.1%</span>
                </div>
                <div className={styles.card}>
                    <span className={styles.cardTitle}>Click-Through Rate</span>
                    <span className={styles.cardValue}>4.18%</span>
                    <span className={`${styles.cardChange} ${styles.negative}`}>-2.4%</span>
                </div>
                <div className={styles.card}>
                    <span className={styles.cardTitle}>Cost Per Click</span>
                    <span className={styles.cardValue}>$0.65</span>
                    <span className={`${styles.cardChange} ${styles.positive}`}>-5.0%</span>
                </div>
            </div>

            {/* Main Chart */}
            <div className={styles.chartSection}>
                <h2 className={styles.sectionTitle}>Performance Over Time</h2>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <AreaChart
                            data={performanceData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#20f928" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#20f928" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorClick" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="rgba(255, 255, 255, 0.4)" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="rgba(255, 255, 255, 0.4)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                            <Legend />
                            <Area type="monotone" dataKey="impressions" stroke="#20f928" fillOpacity={1} fill="url(#colorImp)" strokeWidth={2} />
                            <Area type="monotone" dataKey="clicks" stroke="rgba(255, 255, 255, 0.4)" fillOpacity={1} fill="url(#colorClick)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
