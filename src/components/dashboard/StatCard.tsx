"use client";

import React from 'react';
import Link from 'next/link';
import styles from './StatCard.module.css';

interface StatCardProps {
    label: string;
    value: string | number | null;
    change?: string;
    isPositive?: boolean;
    trend?: 'positive' | 'negative' | 'neutral';
    href?: string;
    isLoading?: boolean;
    color?: string;
    changeColor?: string;
}

export default function StatCard({
    label,
    value,
    change,
    isPositive, // For backward compatibility
    trend,
    href,
    isLoading,
    color,
    changeColor
}: StatCardProps) {
    const isShowingLoading = isLoading || value === undefined || value === null;

    const content = (
        <>
            <span className={styles.statLabel}>{label}</span>
            <div className={styles.statValue} style={color ? { color } : {}}>
                {isShowingLoading ? '...' : value}
            </div>
            {change && (
                <div className={`${styles.statChange} ${trend === 'positive' || (trend === undefined && isPositive === true) ? styles.positive :
                    trend === 'negative' || (trend === undefined && isPositive === false) ? styles.negative :
                        styles.neutral
                    }`} style={changeColor ? { color: changeColor, opacity: 0.8 } : (color ? { color, opacity: 0.8 } : {})}>
                    {change}
                </div>
            )}
        </>
    );

    if (href) {
        return (
            <Link href={href} className={`${styles.statCard} ${styles.clickable}`}>
                {content}
            </Link>
        );
    }

    return (
        <div className={styles.statCard}>
            {content}
        </div>
    );
}
