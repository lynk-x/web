"use client";

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import Link from 'next/link';
// Imports removed as table is gone

// State and logic removed as table is gone

export default function DashboardOverview() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Welcome back, John 👋</h1>
                    <p className={styles.subtitle}>Here is what is happening with your events today.</p>
                </div>
                <div className={styles.headerActions}>
                    <Link href="/dashboard/organize/events/create" className={styles.btnPrimary}>
                        + New Event
                    </Link>
                </div>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Revenue</span>
                    <div className={styles.statValue}>KES 124,500</div>
                    <span className={`${styles.statChange} ${styles.positive}`}>+12% from last month</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Tickets Sold</span>
                    <div className={styles.statValue}>482</div>
                    <span className={`${styles.statChange} ${styles.positive}`}>+24 new today</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Active Events</span>
                    <div className={styles.statValue}>3</div>
                    <span className={styles.statNote}>2 upcoming, 1 live</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Page Views</span>
                    <div className={styles.statValue}>12.5k</div>
                    <span className={`${styles.statChange} ${styles.negative}`}>-2% from last week</span>
                </div>
            </div>

            {/* Quick Actions */}
            <section className={styles.quickActions}>
                <h2 className={styles.sectionTitle}>Quick Actions</h2>
                <div className={styles.actionsGrid}>
                    <button className={styles.actionCard} onClick={() => console.log('Promote')}>
                        <span className={styles.actionLabel}>Promote Event</span>
                    </button>
                    <button className={styles.actionCard} onClick={() => console.log('Export')}>
                        <span className={styles.actionLabel}>Export Report</span>
                    </button>
                    <button className={styles.actionCard} onClick={() => console.log('Messages')}>
                        <span className={styles.actionLabel}>Check Messages</span>
                    </button>
                    <button className={styles.actionCard} onClick={() => console.log('Support')}>
                        <span className={styles.actionLabel}>Help & Support</span>
                    </button>
                </div>
            </section>

            {/* Recent Activity Feed */}
            <section className={styles.activitySection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Recent Activity</h2>
                    <Link href="/dashboard/organize/notifications" className={styles.viewAllLink}>View All</Link>
                </div>
                <div className={styles.activityFeed}>
                    {[
                        { id: 1, text: 'You sold 5 VIP tickets for "Nairobi Tech Summit"', time: '2 mins ago' },
                        { id: 2, text: 'New comment on "AfroBeats Festival"', time: '1 hour ago' },
                        { id: 3, text: '"Startup Pitch Night" was approved', time: '3 hours ago' },
                        { id: 4, text: 'Payout of KES 45,000 processed', time: 'Yesterday' },
                    ].map(activity => (
                        <div key={activity.id} className={styles.activityItem}>
                            <div className={styles.activityContent}>
                                <p className={styles.activityText}>{activity.text}</p>
                                <span className={styles.activityTime}>{activity.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
