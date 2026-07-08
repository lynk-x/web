"use client";

import React from 'react';
import styles from '@/components/dashboard/DashboardShared.module.css';
import BackButton from '@/components/shared/BackButton';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import Spinner from '@/components/shared/Spinner';

interface HeaderAction {
    label: string;
    onClick?: (e: React.FormEvent) => void;
    isLoading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit';
    formId?: string;
    icon?: React.ReactNode;
    className?: string;
}

interface SubPageHeaderProps extends React.PropsWithChildren<{
    title: string;
    subtitle?: string;
    onBack?: () => void; // Optional custom back logic
    backHref?: string;   // Optional specific link to go back to
    backLabel?: string;  // Custom label for back button
    isDirty?: boolean;   // For the dirty check in BackButton
    primaryAction?: HeaderAction;
    secondaryAction?: HeaderAction;
    badge?: {
        label: string;
        variant?: BadgeVariant;
    };
    hideDivider?: boolean;
}> {}

const SubPageHeader: React.FC<SubPageHeaderProps> = ({
    title,
    subtitle,
    onBack,
    backHref,
    backLabel = "Back",
    isDirty = false,
    primaryAction,
    secondaryAction,
    badge,
    hideDivider = false,
    children
}) => {
    return (
        <header className={styles.header} style={{ 
            marginBottom: '12px', 
            alignItems: 'center', 
            borderBottom: hideDivider ? 'none' : '1px solid var(--color-interface-outline)', 
            paddingBottom: hideDivider ? '0' : '24px' 
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <BackButton label={backLabel} isDirty={isDirty} href={backHref} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1 className={styles.title} style={{ margin: 0 }}>{title}</h1>
                        {badge && (
                            <Badge label={badge.label} variant={badge.variant} />
                        )}
                    </div>
                    {subtitle && <p className={styles.subtitle} style={{ margin: 0 }}>{subtitle}</p>}
                </div>
                {children}
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {secondaryAction && (
                    <button
                        type={secondaryAction.type || 'button'}
                        form={secondaryAction.formId}
                        className={`${styles.btnSecondary}${secondaryAction.className ? ` ${secondaryAction.className}` : ''}`}
                        onClick={secondaryAction.onClick ? (e) => secondaryAction.onClick!(e) : undefined}
                        disabled={secondaryAction.isLoading || secondaryAction.disabled}
                    >
                        {secondaryAction.icon && (
                            <span style={{ display: 'flex', alignItems: 'center', opacity: secondaryAction.isLoading ? 0.5 : 1 }}>
                                {secondaryAction.icon}
                            </span>
                        )}
                        <span>{secondaryAction.label}</span>
                    </button>
                )}

                {primaryAction && (
                    <button
                        type={primaryAction.type || 'button'}
                        form={primaryAction.formId}
                        className={`${styles.btnPrimary}${primaryAction.className ? ` ${primaryAction.className}` : ''}`}
                        onClick={primaryAction.onClick ? (e) => primaryAction.onClick!(e) : undefined}
                        disabled={primaryAction.isLoading || primaryAction.disabled}
                    >
                        {primaryAction.isLoading ? (
                            <>
                                <Spinner size={16} />
                                {primaryAction.type === 'submit' ? 'Saving...' : 'Wait...'}
                            </>
                        ) : (
                            <>
                                {primaryAction.icon && (
                                    <span style={{ display: 'flex', alignItems: 'center' }}>
                                        {primaryAction.icon}
                                    </span>
                                )}
                                <span>{primaryAction.label}</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </header>
    );
};

export default SubPageHeader;
