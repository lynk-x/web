"use client";

import React, { useState } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import ReportCard, { Report } from '@/components/admin/ReportCard';
import SystemHealth from '@/components/admin/SystemHealth';
import LogConsole from '@/components/admin/LogConsole';
import SystemConfigTable from '@/components/admin/SystemConfigTable';

// Mock Bug Reports (moved from old Reports page)
const mockBugs: Report[] = [
    {
        id: '1',
        type: 'bug',
        title: 'Checkout Flow Crashing on Mobile',
        description: 'Several users reported app crash when clicking "Pay now" on iOS Safari devices.',
        date: '5 hrs ago',
        reporter: 'System Monitor',
        status: 'in_review'
    },
    {
        id: '2',
        type: 'system',
        title: 'Database High Latency Warning',
        description: 'Database query read latency exceeded 500ms for 5 minutes during peak load.',
        date: '2 days ago',
        reporter: 'System Monitor',
        status: 'resolved'
    }
];

// Mock Environment Variables
const mockEnvVars = [
    { key: 'NODE_ENV', value: 'production' },
    { key: 'DATABASE_URL', value: 'postgres://user:***@db.lynk-x.io:5432/lynkx_prod' },
    { key: 'REDIS_URL', value: 'redis://cache.lynk-x.io:6379' },
    { key: 'API_KEY_STRIPE', value: 'pk_live_********************' },
    { key: 'NEXT_PUBLIC_API_URL', value: 'https://api.lynk-x.io/v1' },
    { key: 'LOG_LEVEL', value: 'info' },
];

export default function AdminSystemPage() {
    const [activeTab, setActiveTab] = useState('health');

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={adminStyles.title}>System Status</h1>
                    <p className={adminStyles.subtitle}>Monitor server health, logs, and technical configuration.</p>
                </div>
            </header>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'health' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('health')}
                >
                    System Health & Metrics
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'logs' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('logs')}
                >
                    Live Server Logs
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'bugs' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('bugs')}
                >
                    Bug Reports
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'env' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('env')}
                >
                    Environment Config
                </button>
            </div>

            {activeTab === 'health' && (
                <SystemHealth />
            )}

            {activeTab === 'logs' && (
                <LogConsole />
            )}

            {activeTab === 'bugs' && (
                <div className={styles.reportsGrid}>
                    {mockBugs.map(bug => (
                        <ReportCard key={bug.id} report={bug} />
                    ))}
                    {mockBugs.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', opacity: 0.5, padding: '40px' }}>
                            All systems normal. No active bug reports.
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'env' && (
                <div className={styles.envContainer}>
                    <SystemConfigTable config={mockEnvVars} />
                </div>
            )}
        </div>
    );
}
