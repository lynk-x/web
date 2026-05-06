"use client";

import React from 'react';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';

interface Option {
    value: string;
    label: string;
}

interface StatusFilterChipsProps {
    options: Option[];
    currentValue: string;
    onChange: (value: string) => void;
    className?: string;
}

/**
 * Standardized status filter chips for administrative moderation hubs.
 */
const StatusFilterChips: React.FC<StatusFilterChipsProps> = ({
    options,
    currentValue,
    onChange,
    className = '',
}) => {
    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} className={className}>
            {options.map(({ value, label }) => (
                <button
                    key={value}
                    className={`${adminStyles.chip} ${currentValue === value ? adminStyles.chipActive : ''}`}
                    onClick={() => onChange(value)}
                >
                    {label}
                </button>
            ))}
        </div>
    );
};

export default StatusFilterChips;
