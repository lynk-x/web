"use client";

import { useEffect, useState } from 'react';
import styles from './WorldClock.module.css';

interface ClockProps {
    label: string;
    timezone: string;
    isUTC?: boolean;
}

const ClockCard = ({ label, timezone, isUTC }: ClockProps) => {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!time) return (
        <div className={styles.card}>
            <span className={styles.cityName}>{label}</span>
            <span className={styles.time}>--:--:--</span>
        </div>
    );

    const timeString = time.toLocaleTimeString('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const dateString = time.toLocaleDateString('en-GB', {
        timeZone: timezone,
        day: '2-digit',
        month: 'short'
    });

    // Simple Day/Night logic (6am to 6pm)
    const hour = parseInt(time.toLocaleTimeString('en-GB', { timeZone: timezone, hour: '2-digit', hour12: false }));
    const isDay = hour >= 6 && hour < 18;

    return (
        <div className={styles.card}>
            {isUTC && <span className={styles.utcBadge}>SYSTEM</span>}
            <span className={styles.cityName}>
                {label} {isDay ? '☀️' : '🌙'}
            </span>
            <span className={styles.time}>{timeString}</span>
            <span className={styles.date}>{dateString}</span>
        </div>
    );
};

export default function WorldClock() {
    return (
        <div className={styles.grid}>
            <ClockCard label="New York" timezone="America/New_York" />
            <ClockCard label="UTC" timezone="UTC" isUTC />
            <ClockCard label="Nairobi" timezone="Africa/Nairobi" />
            <ClockCard label="Tokyo" timezone="Asia/Tokyo" />
        </div>
    );
}
