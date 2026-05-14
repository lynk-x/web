"use client";

import React from 'react';
import Button from '@/components/shared/Button';
import styles from './DashboardShared.module.css';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onActionClick?: () => void;
    actionHref?: string;
    actionIcon?: React.ReactNode;
    actionClassName?: string;
    customAction?: React.ReactNode;
}

export default function PageHeader({
    title,
    subtitle,
    actionLabel,
    onActionClick,
    actionHref,
    actionIcon,
    actionClassName,
    customAction
}: PageHeaderProps) {
    const renderAction = () => {
        if (customAction) return customAction;
        if (!actionLabel) return null;

        return (
            <Button 
                href={actionHref} 
                onClick={onActionClick} 
                variant="primary" 
                className={actionClassName}
                icon={actionIcon}
            >
                {actionLabel}
            </Button>
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
