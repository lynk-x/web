"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './page.module.css';

const AdminMap = dynamic(() => import('@/components/admin/overview/AdminMap'), { ssr: false });

// Mock Data
const stats = [
    { label: 'Total Revenue', value: '$45,200', change: '+12%', isPositive: true, href: '/dashboard/admin/finance' },
    { label: 'Active Events', value: '856', change: '+3.1%', isPositive: true, href: '/dashboard/admin/events' },
    { label: 'Pending Campaigns', value: '14', change: 'Needs Approval', isPositive: false, color: '#fdd835', href: '/dashboard/admin/campaigns' },
    { label: 'Open Tickets', value: '24', change: '3 High Priority', isPositive: false, color: '#e57373', href: '/dashboard/admin/support' },
    { label: 'Flagged Content', value: '8', change: 'Requires Review', isPositive: false, color: '#ffb74d', href: '/dashboard/admin/moderation' },
    { label: 'System Health', value: '99.9%', change: 'Operational', isPositive: true, color: '#81c784', href: '/dashboard/admin/system' },
];

export default function AdminDashboard() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Admin Overview</h1>
                    <p className={styles.subtitle}>Welcome back, Administrator. Here's what's happening today.</p>
                </div>
            </header>

            {/* Key Metrics */}
            <div className={styles.statsGrid}>
                {stats.map((stat, index) => (
                    <Link key={index} href={stat.href} className={styles.statCard}>
                        <span className={styles.statLabel}>{stat.label}</span>
                        <div className={styles.statValue} style={stat.color ? { color: stat.color } : {}}>{stat.value}</div>
                        <div className={`${styles.statChange} ${stat.isPositive ? styles.positive : styles.negative}`} style={stat.color ? { color: stat.color, opacity: 0.8 } : {}}>
                            {stat.change}
                        </div>
                    </Link>
                ))}
            </div>

            {/* Map Section */}
            <section style={{ marginTop: '24px' }}>
                <h2 className={styles.sectionTitle}>Live Activity Map</h2>
                <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden', height: '500px', position: 'relative' }}>
                    <AdminMap />
                </div>
            </section>
        </div>
    );
}
