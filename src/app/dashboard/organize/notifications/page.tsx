"use client";

import { useState } from 'react';
import styles from './page.module.css';
import NotificationTable, { NotificationItem } from '@/components/organize/NotificationTable';


export default function NotificationsPage() {
    const [settings, setSettings] = useState({
        marketing: true,
        security: true,
        activity: true,
        updates: false
    });

    const [frequency, setFrequency] = useState('daily');

    const history: NotificationItem[] = [
        { id: '1', type: 'success', title: 'Ticket Sale confirmed', description: 'You sold 2 VIP tickets to "Nairobi Tech Summit"', time: '2 hours ago', read: false },
        { id: '2', type: 'email', title: 'Weekly Performance Report', description: 'Your weekly analytics digest has been sent to your email.', time: '1 day ago', read: true },
        { id: '3', type: 'alert', title: 'New Login Detected', description: 'A new login from Chrome on Windows was detected.', time: '3 days ago', read: true },
    ];

    const handleToggle = (key: keyof typeof settings) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Notifications</h1>
                <p className={styles.subtitle}>Manage how and when you receive updates.</p>
            </header>

            {/* Email Preferences */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>Email Preferences</h2>
                        <p className={styles.sectionDesc}>Customize which emails you'd like to receive.</p>
                    </div>
                    {/* Mock Frequency Control */}
                    <select
                        className={styles.select}
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                    >
                        <option value="instant">Instant</option>
                        <option value="daily">Daily Digest</option>
                        <option value="weekly">Weekly Summary</option>
                    </select>
                </div>

                <div className={styles.settingGroup}>
                    <div className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>Essential Updates</span>
                            <p className={styles.settingDesc}>Security alerts, password resets, and support messages.</p>
                        </div>
                        {/* Always on for essential */}
                        <label className={styles.toggleSwitch} style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                            <input type="checkbox" checked readOnly />
                            <span className={styles.slider}></span>
                        </label>
                    </div>

                    <div className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>Event Activity</span>
                            <p className={styles.settingDesc}>New ticket sales, attendee check-ins, and event reminders.</p>
                        </div>
                        <label className={styles.toggleSwitch}>
                            <input
                                type="checkbox"
                                checked={settings.activity}
                                onChange={() => handleToggle('activity')}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>

                    <div className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>Marketing & Offers</span>
                            <p className={styles.settingDesc}>Tips, product updates, and special promotions.</p>
                        </div>
                        <label className={styles.toggleSwitch}>
                            <input
                                type="checkbox"
                                checked={settings.marketing}
                                onChange={() => handleToggle('marketing')}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>
                </div>
            </section>

            {/* Push Notifications (Mock) */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>Push Notifications</h2>
                        <p className={styles.sectionDesc}>Get real-time alerts on your browser or device.</p>
                    </div>
                </div>
                <div className={styles.settingGroup}>
                    <div className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>Browser Notifications</span>
                            <p className={styles.settingDesc}>Allow us to send notifications while you are using the app.</p>
                        </div>
                        <label className={styles.toggleSwitch}>
                            <input
                                type="checkbox"
                                checked={settings.security}
                                onChange={() => handleToggle('security')}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>
                </div>
            </section>

            {/* Notification History */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>Recent Activity</h2>
                        <p className={styles.sectionDesc}>Log of recent alerts sent to you.</p>
                    </div>
                </div>

                <NotificationTable notifications={history} />
            </section>
        </div>
    );
}
