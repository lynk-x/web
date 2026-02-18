"use client";

import React from 'react';
import styles from './BulkActionsBar.module.css';

export type { BulkAction } from '@/types/shared';
import type { BulkAction } from '@/types/shared';

interface BulkActionsBarProps {
    selectedCount: number;
    actions: BulkAction[];
    onCancel: () => void;
    itemTypeLabel?: string; // e.g., "users", "events"
}

/**
 * Standardized bar for bulk operations on selected table items.
 * Appears when items are selected and provides a unified UI for batch actions.
 */
const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
    selectedCount,
    actions,
    onCancel,
    itemTypeLabel = "items"
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className={styles.container}>
            <div className={styles.info}>
                <span className={styles.count}>{selectedCount}</span>
                <span className={styles.label}>{itemTypeLabel} selected</span>
            </div>

            <div className={styles.actions}>
                <button className={styles.cancelBtn} onClick={onCancel}>
                    Cancel
                </button>

                <div className={styles.divider} />

                {actions.map((action, index) => (
                    <button
                        key={index}
                        className={`${styles.actionBtn} ${action.variant ? styles[action.variant] : ''}`}
                        onClick={action.onClick}
                    >
                        {action.icon && <span className={styles.icon}>{action.icon}</span>}
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default BulkActionsBar;
