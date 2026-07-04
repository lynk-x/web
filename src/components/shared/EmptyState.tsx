"use client";

import styles from './EmptyState.module.css';

interface EmptyStateProps {
    message: string;
    /** Optional icon, e.g. an inline <svg>. Omit for text-only (the DataTable default). */
    icon?: React.ReactNode;
    /** Optional action rendered below the message, e.g. a "+ Add Tag" button. */
    action?: React.ReactNode;
    /** Fixed height for standalone (non-table) contexts like chart panels. */
    height?: number;
}

export default function EmptyState({ message, icon, action, height }: EmptyStateProps) {
    return (
        <div className={styles.emptyState} style={height ? { height } : undefined}>
            {icon && <div className={styles.icon}>{icon}</div>}
            <div className={styles.message}>{message}</div>
            {action && <div className={styles.action}>{action}</div>}
        </div>
    );
}
