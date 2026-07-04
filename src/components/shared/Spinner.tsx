"use client";

import styles from './Spinner.module.css';

interface SpinnerProps {
    size?: number;
    /** Optional label rendered next to the spinner, e.g. "Loading data...". */
    label?: string;
    /** Centers the spinner (and label) in a full-width flex row with padding — for page/section-level loading states. */
    centered?: boolean;
}


export default function Spinner({ size = 20, label, centered }: SpinnerProps) {
    const spinner = (
        <svg
            className={styles.spinner}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );

    if (!label && !centered) return spinner;

    return (
        <div className={centered ? styles.centered : styles.inline}>
            {spinner}
            {label && <span>{label}</span>}
        </div>
    );
}
