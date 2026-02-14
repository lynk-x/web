import React from 'react';
import styles from './page.module.css';
import Link from 'next/link';

export default function DashboardOverview() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Welcome back, John 👋</h1>
                    <p className={styles.subtitle}>Here is what is happening with your events today.</p>
                </div>
                <Link href="/dashboard/events/create" className={styles.createBtn}>
                    + Create Event
                </Link>
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

            <div className={styles.contentGrid}>
                <div className={styles.recentActivity}>
                    <h2 className={styles.sectionTitle}>Recent Ticket Sales</h2>
                    <div className={styles.activityList}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className={styles.activityItem}>
                                <div className={styles.activityIcon}>🎟️</div>
                                <div className={styles.activityInfo}>
                                    <span className={styles.activityText}><strong>Alex M.</strong> bought 2x VIP for Tech Summit</span>
                                    <span className={styles.activityTime}>{i * 15} mins ago</span>
                                </div>
                                <div className={styles.activityAmount}>+ KES 10,000</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.upcomingEvents}>
                    <h2 className={styles.sectionTitle}>Your Upcoming Events</h2>
                    <div className={styles.eventList}>
                        <div className={styles.eventCard}>
                            <div className={styles.eventDate}>
                                <span className={styles.month}>OCT</span>
                                <span className={styles.day}>12</span>
                            </div>
                            <div className={styles.eventInfo}>
                                <h3 className={styles.eventName}>Nairobi Tech Summit 2024</h3>
                                <div className={styles.eventMeta}>KICC • 9:00 AM</div>
                            </div>
                            <div className={styles.eventStatus}>published</div>
                        </div>
                        <div className={styles.eventCard}>
                            <div className={styles.eventDate}>
                                <span className={styles.month}>NOV</span>
                                <span className={styles.day}>05</span>
                            </div>
                            <div className={styles.eventInfo}>
                                <h3 className={styles.eventName}>AfroBeats Festival</h3>
                                <div className={styles.eventMeta}>Carnivore • 6:00 PM</div>
                            </div>
                            <div className={styles.eventStatus}>published</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
