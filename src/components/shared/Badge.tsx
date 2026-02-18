"use client";

import React from 'react';
import styles from './Badge.module.css';

export type { BadgeVariant } from '@/types/shared';
import type { BadgeVariant } from '@/types/shared';

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    showDot?: boolean;
    className?: string; // For additional ad-hoc placement styles
}

/**
 * Standardized Badge component for statuses, roles, and categories.
 * Provides unified semantic coloring and styling across the dashboard.
 */
const Badge: React.FC<BadgeProps> = ({
    label,
    variant = 'neutral',
    showDot = false,
    className = ''
}) => {
    return (
        <span className={`${styles.badge} ${styles[variant]} ${className}`}>
            {showDot && <span className={styles.dot}></span>}
            {label}
        </span>
    );
};

export default Badge;
