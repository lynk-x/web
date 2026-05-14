"use client";

import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string; label: string }[];
    error?: string;
    containerClassName?: string;
}

export default function Select({
    label,
    options,
    error,
    containerClassName = '',
    className = '',
    id,
    ...props
}: SelectProps) {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <div className={`input-group ${containerClassName}`}>
            {label && <label htmlFor={selectId} className="label-base">{label}</label>}
            <select
                id={selectId}
                className={`select-base ${className}`}
                {...props}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <span className="error-text">{error}</span>}
        </div>
    );
}
