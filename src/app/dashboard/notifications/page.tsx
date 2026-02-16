"use client";

import React, { useState } from 'react';
import styles from './page.module.css';

interface NotificationSetting {
    id: string;
    label: string;
    description: string;
    email: boolean;
    push: boolean;
}

interface NotificationHistoryItem {
    id: string;
    type: 'email' | 'alert' | 'success';
    title: string;
    description: string;
    time: string;
    read: boolean;
}

export default function NotificationsPage() {
    const [settings, setSettings] = useState({
        marketing: true,
        security: true,
        activity: true,
        updates: false
    });

    const [frequency, setFrequency] = useState('daily');

    const history: NotificationHistoryItem[] = [
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

                <div className={styles.historyList}>
                    {history.map(item => (
                        <div key={item.id} className={styles.historyItem}>
                            <div className={`${styles.historyIcon} ${styles[item.type + 'Icon']}`}>
                                {item.type === 'email' && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                )}
                                {item.type === 'alert' && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                )}
                                {item.type === 'success' && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                )}
                            </div>
                            <div className={styles.historyContent}>
                                <h4 className={styles.historyTitle}>{item.title}</h4>
                                <p className={styles.settingDesc}>{item.description}</p>
                            </div>
                            <span className={styles.historyTime}>{item.time}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
