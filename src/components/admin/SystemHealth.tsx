"use client";

import React from 'react';
import styles from './SystemHealth.module.css';

const SystemHealth = () => {
    return (
        <div className={styles.grid}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h3 className={styles.title}>System Uptime</h3>
                    <div className={styles.statusIndicator}>
                        <span className={styles.dot}></span>
                        Operational
                    </div>
                </div>
                <div className={styles.metric}>
                    <span className={styles.value}>99.99%</span>
                    <span className={styles.label}>Last 30 Days</span>
                </div>
                <div className={styles.chartPlaceholder}>
                    {/* Mock Chart Visualization */}
                    <div className={styles.bar} style={{ height: '40%' }}></div>
                    <div className={styles.bar} style={{ height: '60%' }}></div>
                    <div className={styles.bar} style={{ height: '45%' }}></div>
                    <div className={styles.bar} style={{ height: '80%' }}></div>
                    <div className={styles.bar} style={{ height: '70%' }}></div>
                    <div className={styles.bar} style={{ height: '90%' }}></div>
                    <div className={styles.bar} style={{ height: '100%' }}></div>
                    <div className={styles.bar} style={{ height: '85%' }}></div>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.header}>
                    <h3 className={styles.title}>API Latency</h3>
                    <div className={styles.statusIndicator}>
                        <span className={styles.dot}></span>
                        Healthy
                    </div>
                </div>
                <div className={styles.metric}>
                    <span className={styles.value}>45ms</span>
                    <span className={styles.label}>Avg Response Time</span>
                </div>
                <div className={styles.chartPlaceholder}>
                    <div className={styles.line}></div>
                    {/* CSS Line Chart simulation */}
                    <svg viewBox="0 0 100 40" className={styles.lineChart}>
                        <path d="M0 30 Q 10 25, 20 30 T 40 20 T 60 25 T 80 10 T 100 20" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2" />
                        <path d="M0 30 Q 10 25, 20 30 T 40 20 T 60 25 T 80 10 T 100 20 V 40 H 0 Z" fill="url(#gradient)" opacity="0.2" />
                        <defs>
                            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--color-brand-primary)" />
                                <stop offset="100%" stopColor="transparent" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Server Load</h3>
                    <div className={styles.statusIndicator} style={{ color: '#ffb74d' }}>
                        <span className={styles.dot} style={{ backgroundColor: '#ffb74d' }}></span>
                        Moderate
                    </div>
                </div>
                <div className={styles.metric}>
                    <span className={styles.value}>62%</span>
                    <span className={styles.label}>CPU Usage</span>
                </div>
                <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: '62%' }}></div>
                    </div>
                    <div className={styles.metricRow}>
                        <span>Memory</span>
                        <span>4.2GB / 8GB</span>
                    </div>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: '52%', backgroundColor: '#64b5f6' }}></div>
                    </div>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Active Users</h3>
                    <div className={styles.statusIndicator}>
                        <span className={styles.dot}></span>
                        Live
                    </div>
                </div>
                <div className={styles.metric}>
                    <span className={styles.value}>842</span>
                    <span className={styles.label}>Currently Online</span>
                </div>
                <div className={styles.chartPlaceholder}>
                    {/* Mock Chart Visualization */}
                    <div className={styles.bar} style={{ height: '30%', backgroundColor: '#81c784' }}></div>
                    <div className={styles.bar} style={{ height: '50%', backgroundColor: '#81c784' }}></div>
                    <div className={styles.bar} style={{ height: '40%', backgroundColor: '#81c784' }}></div>
                    <div className={styles.bar} style={{ height: '70%', backgroundColor: '#81c784' }}></div>
                    <div className={styles.bar} style={{ height: '60%', backgroundColor: '#81c784' }}></div>
                    <div className={styles.bar} style={{ height: '80%', backgroundColor: '#81c784' }}></div>
                    <div className={styles.bar} style={{ height: '100%', backgroundColor: '#81c784' }}></div>
                    <div className={styles.bar} style={{ height: '90%', backgroundColor: '#81c784' }}></div>
                </div>
            </div>
        </div>
    );
};

export default SystemHealth;
