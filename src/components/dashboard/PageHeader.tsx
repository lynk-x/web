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
    backHref?: string;
}

export default function PageHeader({
    title,
    subtitle,
    actionLabel,
    onActionClick,
    actionHref,
    actionIcon,
    actionClassName,
    customAction,
    backHref
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
                {backHref && (
                    <a 
                        href={backHref} 
                        style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px', 
                            fontSize: '11px', 
                            fontWeight: 600, 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.05em', 
                            color: 'var(--color-brand-primary)', 
                            textDecoration: 'none',
                            marginBottom: '8px',
                            opacity: 0.8
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseOut={(e) => (e.currentTarget.style.opacity = '0.8')}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Back
                    </a>
                )}
                <h1 className={styles.title}>{title}</h1>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            {renderAction()}
        </header>
    );
}
