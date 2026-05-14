"use client";

import React from 'react';
import Link from 'next/link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'back';
    href?: string;
    icon?: React.ReactNode;
    isLoading?: boolean;
}

export default function Button({
    children,
    variant = 'primary',
    href,
    icon,
    isLoading,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseClass = `btn-${variant}`;
    const fullClassName = `${baseClass} ${className}`.trim();

    const content = (
        <>
            {isLoading ? (
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: children ? '8px' : '0' }}>
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2C6.47715 2 2 6.47715 2 12" />
                </svg>
            ) : icon}
            {children}
        </>
    );

    if (href) {
        return (
            <Link href={href} className={fullClassName} {...(props as any)}>
                {content}
            </Link>
        );
    }

    return (
        <button 
            className={fullClassName} 
            disabled={disabled || isLoading} 
            {...props}
        >
            {content}
        </button>
    );
}
