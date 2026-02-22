"use client";

import styles from './page.module.css';
import Link from 'next/link';

// Mock Data
const stats = [
    { label: 'Total Spend', value: '$1,240.50', change: '+12.5%', isPositive: true },
    { label: 'Impressions', value: '45.2k', change: '+8.1%', isPositive: true },
    { label: 'Clicks', value: '1,890', change: '-2.4%', isPositive: false },
    { label: 'Avg. CTR', value: '4.18%', change: '+0.5%', isPositive: true },
];



export default function AdsDashboard() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Welcome back, John 👋</h1>
                    <p className={styles.subtitle}>Manage your campaigns and track performance.</p>
                </div>

            </header>

            {/* Key Metrics */}
            <div className={styles.statsGrid}>
                {stats.map((stat, index) => (
                    <div key={index} className={styles.statCard}>
                        <span className={styles.statLabel}>{stat.label}</span>
                        <div className={styles.statValue}>{stat.value}</div>
                        <div className={`${styles.statChange} ${stat.isPositive ? styles.positive : styles.negative}`}>
                            {stat.change} <span style={{ opacity: 0.6, color: 'var(--color-utility-primaryText)' }}>vs last month</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <section className={styles.quickActions}>
                <h2 className={styles.sectionTitle}>Quick Actions</h2>
                <div className={styles.actionsGrid}>

                    <Link href="/dashboard/ads/assets" className={styles.actionCard}>
                        <span className={styles.actionLabel}>Ad Assets</span>
                    </Link>
                    <Link href="/dashboard/ads/audiences" className={styles.actionCard}>
                        <span className={styles.actionLabel}>Audiences</span>
                    </Link>
                    <Link href="/dashboard/ads/billing" className={styles.actionCard}>
                        <span className={styles.actionLabel}>Billing & Payments</span>
                    </Link>
                </div>
            </section>

        </div>
    );
}
