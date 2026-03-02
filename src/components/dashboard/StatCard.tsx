"use client";

import React from 'react';
import Link from 'next/link';
import styles from './DashboardShared.module.css';

interface StatCardProps {
    label: string;
    value: string | number;
    change?: string;
    isPositive?: boolean;
    trend?: 'positive' | 'negative' | 'neutral';
    href?: string;
    isLoading?: boolean;
    color?: string;
}

export default function StatCard({
    label,
    value,
    change,
    isPositive, // For backward compatibility
    trend,
    href,
    isLoading,
    color
}: StatCardProps) {
    const CardContent = () => (
        <>
            {isLoading ? (
                <div style={{ margin: 'auto' }}>
                    <svg className={styles.spinner} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                    </svg>
                </div>
            ) : (
                <>
                    <span className={styles.statLabel}>{label}</span>
                    <div className={styles.statValue} style={color ? { color } : {}}>{value}</div>
                    {change && (
                        <div className={`${styles.statChange} ${trend === 'positive' || (trend === undefined && isPositive === true) ? styles.positive :
                                trend === 'negative' || (trend === undefined && isPositive === false) ? styles.negative :
                                    styles.neutral
                            }`} style={color ? { color, opacity: 0.8 } : {}}>
                            {change}
                        </div>
                    )}
                </>
            )}
        </>
    );

    if (href) {
        return (
            <Link href={href} className={`${styles.statCard} ${styles.clickable}`}>
                <CardContent />
            </Link>
        );
    }

    return (
        <div className={styles.statCard}>
            <CardContent />
        </div>
    );
}
