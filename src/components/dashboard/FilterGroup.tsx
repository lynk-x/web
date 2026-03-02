"use client";

import React from 'react';
import styles from './DashboardShared.module.css';

interface FilterOption {
    value: string;
    label: string;
}

interface FilterGroupProps {
    options: FilterOption[];
    currentValue: string;
    onChange: (value: string) => void;
}

export default function FilterGroup({
    options,
    currentValue,
    onChange
}: FilterGroupProps) {
    return (
        <div className={styles.filterGroup}>
            {options.map((option) => (
                <button
                    key={option.value}
                    className={`${styles.chip} ${currentValue === option.value ? styles.chipActive : ''}`}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
