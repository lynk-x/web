"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './TableRowActions.module.css';

export type ActionItem =
    | { divider: true }
    | {
        label: string;
        icon?: React.ReactNode;
        onClick: () => void;
        variant?: 'default' | 'danger' | 'success';
        disabled?: boolean;
        divider?: never;
    };

interface TableRowActionsProps {
    actions: ActionItem[];
}

/**
 * Reusable Triple-dot action menu for table rows.
 * Handles dropdown visibility and "click outside" logic centrally.
 */
const TableRowActions: React.FC<TableRowActionsProps> = ({ actions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const toggleMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleActionClick = (e: React.MouseEvent, action: ActionItem) => {
        e.preventDefault();
        e.stopPropagation();

        if ('divider' in action && action.divider) return;

        if (!action.disabled && 'onClick' in action) {
            action.onClick();
            setIsOpen(false);
        }
    };

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                className={`${styles.trigger} ${isOpen ? styles.active : ''}`}
                onClick={toggleMenu}
                aria-label="More actions"
                aria-expanded={isOpen}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="12" cy="5" r="1"></circle>
                    <circle cx="12" cy="19" r="1"></circle>
                </svg>
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    {actions.map((action, index) => {
                        if ('divider' in action && action.divider) {
                            return <div key={index} className={styles.divider} />;
                        }

                        // TypeScript guard
                        if ('divider' in action) return null; // Should not happen given union

                        return (
                            <React.Fragment key={index}>
                                {/* Legacy implicit divider for backward compatibility */}
                                {index > 0 && action.variant === 'danger' &&
                                    // Check if previous item was NOT a divider to avoid double dividers if mixed
                                    !('divider' in actions[index - 1] && actions[index - 1]['divider']) &&
                                    <div className={styles.divider} />
                                }

                                <button
                                    className={`${styles.menuItem} ${action.variant ? styles[action.variant] : ''}`}
                                    onClick={(e) => handleActionClick(e, action)}
                                    disabled={action.disabled}
                                >
                                    {action.icon && <span className={styles.icon}>{action.icon}</span>}
                                    {action.label}
                                </button>
                            </React.Fragment>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TableRowActions;
