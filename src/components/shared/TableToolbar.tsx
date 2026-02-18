"use client";

import React from 'react';
import styles from './TableToolbar.module.css';

interface TableToolbarProps {
    searchPlaceholder?: string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    children?: React.ReactNode; // For additional filters like dropdowns or chips
    className?: string;
}

/**
 * Standardized Toolbar for tables, providing a consistent layout for search and filters.
 */
const TableToolbar: React.FC<TableToolbarProps> = ({
    searchPlaceholder = "Search...",
    searchValue,
    onSearchChange,
    children,
    className = ''
}) => {
    return (
        <div className={`${styles.toolbar} ${className}`}>
            {onSearchChange && searchValue !== undefined && (
                <div className={styles.searchContainer}>
                    <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        className={styles.searchInput}
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            )}

            <div className={styles.filtersContainer}>
                {children}
            </div>
        </div>
    );
};

export default TableToolbar;
