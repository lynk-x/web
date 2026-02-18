"use client";

import { useState, useEffect, useRef } from 'react';
import styles from './LogConsole.module.css';

interface LogEntry {
    id: number;
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
    message: string;
    source: string;
}

const LogConsole = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filter, setFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
    const [autoScroll, setAutoScroll] = useState(true);
    const consoleRef = useRef<HTMLDivElement>(null);

    // Initial Logs
    useEffect(() => {
        const initialLogs: LogEntry[] = [
            { id: 1, timestamp: new Date(Date.now() - 10000).toISOString(), level: 'INFO', message: 'System startup initiated.', source: 'kernel' },
            { id: 2, timestamp: new Date(Date.now() - 9000).toISOString(), level: 'INFO', message: 'Database connection established.', source: 'db-pool' },
            { id: 3, timestamp: new Date(Date.now() - 8000).toISOString(), level: 'WARN', message: 'High latency detected on node-3.', source: 'load-balancer' },
            { id: 4, timestamp: new Date(Date.now() - 5000).toISOString(), level: 'INFO', message: 'Scheduled backup started.', source: 'cron' },
            { id: 5, timestamp: new Date(Date.now() - 2000).toISOString(), level: 'ERROR', message: 'Payment gateway timeout for transaction #tx_9921.', source: 'payment-service' },
        ];
        setLogs(initialLogs);
    }, []);

    // Mock Live Stream
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                const levels: ('INFO' | 'WARN' | 'ERROR')[] = ['INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];
                const sources = ['api-gateway', 'auth-service', 'db-shard-1', 'frontend', 'cron'];
                const messages = [
                    'User authentication successful.',
                    'Cache miss for key user:123.',
                    'Request processed in 23ms.',
                    'Rate limit exceeded for IP 192.168.1.1.',
                    'Database query timeout.'
                ];

                const newLog: LogEntry = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    level: levels[Math.floor(Math.random() * levels.length)],
                    message: messages[Math.floor(Math.random() * messages.length)],
                    source: sources[Math.floor(Math.random() * sources.length)],
                };

                setLogs(prev => [...prev.slice(-99), newLog]); // Keep last 100 logs
            }
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    // Auto-scroll logic
    useEffect(() => {
        if (autoScroll && consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    const filteredLogs = logs.filter(log => filter === 'ALL' || log.level === filter);

    const getLevelClass = (level: string) => {
        switch (level) {
            case 'INFO': return styles.levelInfo;
            case 'WARN': return styles.levelWarn;
            case 'ERROR': return styles.levelError;
            default: return '';
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <div className={styles.filters}>
                    <button
                        className={`${styles.filterBtn} ${filter === 'ALL' ? styles.activeFilter : ''}`}
                        onClick={() => setFilter('ALL')}
                    >All</button>
                    <button
                        className={`${styles.filterBtn} ${filter === 'INFO' ? styles.activeFilter : ''}`}
                        onClick={() => setFilter('INFO')}
                        style={{ color: '#64b5f6' }}
                    >Info</button>
                    <button
                        className={`${styles.filterBtn} ${filter === 'WARN' ? styles.activeFilter : ''}`}
                        onClick={() => setFilter('WARN')}
                        style={{ color: '#ffb74d' }}
                    >Warn</button>
                    <button
                        className={`${styles.filterBtn} ${filter === 'ERROR' ? styles.activeFilter : ''}`}
                        onClick={() => setFilter('ERROR')}
                        style={{ color: '#e57373' }}
                    >Error</button>
                </div>
                <div className={styles.actions}>
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={autoScroll}
                            onChange={(e) => setAutoScroll(e.target.checked)}
                        />
                        Auto-scroll
                    </label>
                    <button className={styles.clearBtn} onClick={() => setLogs([])}>Clear</button>
                </div>
            </div>
            <div className={styles.console} ref={consoleRef}>
                {filteredLogs.map(log => (
                    <div key={log.id} className={styles.logLine}>
                        <span className={styles.timestamp}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className={`${styles.level} ${getLevelClass(log.level)}`}>{log.level}</span>
                        <span className={styles.source}>[{log.source}]</span>
                        <span className={styles.message}>{log.message}</span>
                    </div>
                ))}
                {filteredLogs.length === 0 && (
                    <div className={styles.emptyState}>No logs to display.</div>
                )}
            </div>
        </div>
    );
};

export default LogConsole;
