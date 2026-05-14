"use client";

import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    containerClassName?: string;
}

export default function Textarea({
    label,
    error,
    containerClassName = '',
    className = '',
    id,
    ...props
}: TextareaProps) {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <div className={`input-group ${containerClassName}`}>
            {label && <label htmlFor={textareaId} className="label-base">{label}</label>}
            <textarea
                id={textareaId}
                className={`textarea-base ${className}`}
                {...props}
            />
            {error && <span className="error-text">{error}</span>}
        </div>
    );
}
