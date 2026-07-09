"use client";

import React from 'react';
import styles from './CloseButton.module.css';

interface CloseButtonProps {
    onClick: () => void;
    className?: string;
    'aria-label'?: string;
}

/**
 * Standalone icon-only close (X) button. Used in page headers to dismiss/
 * exit a sub-page — replaces the old BackButton (a text link with an arrow
 * that navigated back in history/to a fixed href).
 */
export default function CloseButton({
    onClick,
    className = '',
    'aria-label': ariaLabel = 'Close',
}: CloseButtonProps) {
    return (
        <button
            type="button"
            className={`${styles.closeBtn} ${className}`.trim()}
            onClick={onClick}
            aria-label={ariaLabel}
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    );
}
