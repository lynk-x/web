"use client";

import React from 'react';
import styles from './NotificationTable.module.css';

export interface NotificationItem {
    id: string;
    type: 'email' | 'alert' | 'success';
    title: string;
    description: string;
    time: string;
    read: boolean;
}

interface NotificationTableProps {
    notifications: NotificationItem[];
}

const NotificationTable: React.FC<NotificationTableProps> = ({ notifications }) => {
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

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{ width: '60px' }}>Type</th>
                        <th>Notification</th>
                        <th style={{ width: '150px', textAlign: 'right' }}>Time</th>
                    </tr>
                </thead>
                <tbody>
                    {notifications.map((item) => (
                        <tr key={item.id} className={item.read ? styles.read : ''}>
                            <td className={styles.iconCell}>
                                <div className={`${styles.icon} ${getIconClass(item.type)}`}>
                                    {getIcon(item.type)}
                                </div>
                            </td>
                            <td>
                                <div className={styles.title}>{item.title}</div>
                                <div className={styles.description}>{item.description}</div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                                <span className={styles.time}>{item.time}</span>
                            </td>
                        </tr>
                    ))}
                    {notifications.length === 0 && (
                        <tr>
                            <td colSpan={3} style={{ textAlign: 'center', padding: '32px', opacity: 0.5 }}>
                                No notifications found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default NotificationTable;
