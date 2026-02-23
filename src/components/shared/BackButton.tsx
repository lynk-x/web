"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/dashboard/admin/page.module.css';

interface BackButtonProps {
    label?: string;
    className?: string;
    isDirty?: boolean;
}

export default function BackButton({ label = 'Back to Overview', className = '', isDirty = false }: BackButtonProps) {
    const router = useRouter();

    const handleBack = () => {
        if (isDirty) {
            const confirmLeave = window.confirm("You have unsaved changes. Are you sure you want to leave?");
            if (!confirmLeave) return;
        }
        router.back();
    };

    return (
        <button
            onClick={handleBack}
            className={`${styles.btnBack} ${className}`}
        >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            {label}
        </button>
    );
}
