"use client";

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    containerClassName?: string;
}

export default function Input({
    label,
    error,
    containerClassName = '',
    className = '',
    id,
    ...props
}: InputProps) {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <div className={`input-group ${containerClassName}`}>
            {label && <label htmlFor={inputId} className="label-base">{label}</label>}
            <input
                id={inputId}
                className={`input-base ${className}`}
                {...props}
            />
            {error && <span className="error-text">{error}</span>}
        </div>
    );
}
