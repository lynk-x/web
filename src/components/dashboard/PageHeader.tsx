"use client";

import React from 'react';
import Link from 'next/link';
import styles from './DashboardShared.module.css';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onActionClick?: () => void;
    actionHref?: string;
    actionIcon?: React.ReactNode;
}

export default function PageHeader({
    title,
    subtitle,
    actionLabel,
    onActionClick,
    actionHref,
    actionIcon
}: PageHeaderProps) {
    const renderAction = () => {
        if (!actionLabel) return null;

        if (actionHref) {
            return (
                <Link href={actionHref} className={styles.btnPrimary}>
                    {actionIcon}
                    {actionLabel}
                </Link>
            );
        }

        return (
            <button className={styles.btnPrimary} onClick={onActionClick}>
                {actionIcon}
                {actionLabel}
            </button>
        );
    };

    return (
        <header className={styles.header}>
            <div>
                <h1 className={styles.title}>{title}</h1>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            {renderAction()}
        </header>
    );
}
