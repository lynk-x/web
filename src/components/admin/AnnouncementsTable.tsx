"use client";

import React from 'react';
import styles from './AnnouncementsTable.module.css';

interface Announcement {
    id: number | string;
    title: string;
    message: string;
    date: string;
    target: string;
    sender: string;
}

interface AnnouncementsTableProps {
    announcements: Announcement[];
}

const AnnouncementsTable: React.FC<AnnouncementsTableProps> = ({ announcements }) => {
    return (
        <div className={styles.tableContainer}>
            {announcements.map((item) => (
                <div key={item.id} className={styles.item}>
                    <div className={styles.header}>
                        <span className={styles.title}>{item.title}</span>
                        <span className={styles.date}>{item.date}</span>
                    </div>
                    <p className={styles.message}>
                        {item.message}
                    </p>
                    <div className={styles.meta}>
                        Target: {item.target} • Sent by: {item.sender}
                    </div>
                </div>
            ))}
            {announcements.length === 0 && (
                <div style={{ textAlign: 'center', opacity: 0.5, padding: '20px' }}>
                    No recent announcements.
                </div>
            )}
        </div>
    );
};

export default AnnouncementsTable;
