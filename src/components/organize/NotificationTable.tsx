"use client";

import React from 'react';
import styles from './NotificationTable.module.css';
import DataTable, { Column } from '../shared/DataTable';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { NotificationItem } from '@/types/organize';
import type { NotificationItem } from '@/types/organize';

interface NotificationTableProps {
    notifications: NotificationItem[];
}

// ─── Icon Helpers ────────────────────────────────────────────────────────────

const getIconClass = (type: string) => {
    switch (type) {
        case 'email': return styles.emailIcon;
        case 'alert': return styles.alertIcon;
        case 'success': return styles.successIcon;
        default: return '';
    }
};

const getIcon = (type: string) => {
    switch (type) {
        case 'email':
            return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
        case 'alert':
            return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
        case 'success':
            return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
        default:
            return null;
    }
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Organizer notifications table.
 * Displays notification type icons, titles, descriptions, and timestamps.
 * Read notifications receive a dimmed style via the `read` class.
 */
const NotificationTable: React.FC<NotificationTableProps> = ({ notifications }) => {
    /** Column definitions for the notifications table. */
    const columns: Column<NotificationItem>[] = [
        {
            header: 'Type',
            headerStyle: { width: '60px' },
            render: (item) => (
                <div className={styles.iconCell}>
                    <div className={`${styles.icon} ${getIconClass(item.type)}`}>
                        {getIcon(item.type)}
                    </div>
                </div>
            ),
        },
        {
            header: 'Notification',
            render: (item) => (
                <div>
                    <div className={styles.title}>{item.title}</div>
                    <div className={styles.description}>{item.description}</div>
                </div>
            ),
        },
        {
            header: 'Time',
            headerStyle: { width: '150px', textAlign: 'right' },
            render: (item) => (
                <div style={{ textAlign: 'right' }}>
                    <span className={styles.time}>{item.time}</span>
                </div>
            ),
        },
    ];

    return (
        <DataTable<NotificationItem>
            data={notifications}
            columns={columns}
            emptyMessage="No notifications found."
        />
    );
};

export default NotificationTable;
