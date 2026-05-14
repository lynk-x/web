"use client";

import React from 'react';

interface FilterOption {
    value: string;
    label: string;
}

interface FilterChipsProps {
    options: FilterOption[];
    currentValue: string;
    onChange: (value: string) => void;
    className?: string;
}

/**
 * Standardized filter chips for dashboard pages.
 * Replaces legacy FilterGroup and StatusFilterChips.
 */
export default function FilterChips({
    options,
    currentValue,
    onChange,
    className = '',
}: FilterChipsProps) {
    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} className={className}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    className={`chip-base ${currentValue === option.value ? 'chip-active' : ''}`}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
