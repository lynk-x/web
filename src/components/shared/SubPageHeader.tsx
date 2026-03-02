"use client";

import React from 'react';
import styles from '@/app/dashboard/admin/page.module.css';
import BackButton from '@/components/shared/BackButton';

interface SubPageHeaderProps {
    title: string;
    subtitle?: string;
    onBack?: () => void; // Optional custom back logic
    isDirty?: boolean;   // For the dirty check in BackButton
    primaryAction?: {
        label: string;
        onClick?: (e: React.FormEvent) => void;
        isLoading?: boolean;
        type?: 'button' | 'submit';
        formId?: string;
    };
}

const SubPageHeader: React.FC<SubPageHeaderProps> = ({
    title,
    subtitle,
    onBack,
    isDirty = false,
    primaryAction
}) => {
    return (
        <header className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <BackButton label="Back" isDirty={isDirty} />
                <h1 className={styles.title} style={{ margin: 0 }}>{title}</h1>
                {subtitle && <p className={styles.subtitle} style={{ margin: 0 }}>{subtitle}</p>}
            </div>

            {primaryAction && (
                <button
                    type={primaryAction.type || 'button'}
                    form={primaryAction.formId}
                    className={styles.btnPrimary}
                    onClick={primaryAction.onClick ? (e) => primaryAction.onClick!(e) : undefined}
                    disabled={primaryAction.isLoading}
                >
                    {primaryAction.isLoading ? (
                        <>
                            <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                            Saving...
                        </>
                    ) : (
                        primaryAction.label
                    )}
                </button>
            )}
        </header>
    );
};

export default SubPageHeader;
