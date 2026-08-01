import React from 'react';
import Link from 'next/link';
import styles from './StatCard.module.css';

interface StatCardProps {
    label: string;
    value: string | number | null;
    change?: string;
    /** @deprecated Use `trend` instead. Only read when `trend` is omitted. */
    isPositive?: boolean;
    trend?: 'positive' | 'negative' | 'neutral';
    href?: string;
    isLoading?: boolean;
    color?: string;
    changeColor?: string;
}

/**
 * A single metric tile (label + value + optional change indicator) used across
 * every dashboard role — admin, organizer, advertiser, and Pulse. Renders as a
 * link when `href` is given, otherwise a static card. `null`/`undefined` value
 * or `isLoading` both render a loading placeholder instead of the value.
 */
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
