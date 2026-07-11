"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/shared/Button';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import Spinner from '@/components/shared/Spinner';
import CloseButton from '@/components/shared/CloseButton';
import styles from './DashboardShared.module.css';

export interface HeaderAction {
    label: string;
    onClick?: (e: React.FormEvent) => void;
    isLoading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit';
    formId?: string;
    icon?: React.ReactNode;
    className?: string;
    href?: string;
}

type PageHeaderProps = React.PropsWithChildren<{
    title: string;
    subtitle?: React.ReactNode;
    badge?: {
        label: string;
        variant?: BadgeVariant;
    };
    primaryAction?: HeaderAction;
    secondaryAction?: HeaderAction;
    /** Where the close (X) button navigates. Omit to hide the close button. */
    closeHref?: string;
    /** Custom close handler, e.g. to confirm unsaved changes before navigating. Takes precedence over closeHref. */
    onClose?: () => void;
    hideDivider?: boolean;

    /** @deprecated use `primaryAction` instead. */
    actionLabel?: string;
    /** @deprecated use `primaryAction` instead. */
    onActionClick?: () => void;
    /** @deprecated use `primaryAction` instead. */
    actionHref?: string;
    /** @deprecated use `primaryAction` instead. */
    actionIcon?: React.ReactNode;
    /** @deprecated use `primaryAction` instead. */
    actionClassName?: string;
    /** @deprecated use `primaryAction`/`secondaryAction` instead. */
    customAction?: React.ReactNode;
}>;

function renderAction(action: HeaderAction, variant: 'primary' | 'secondary') {
    const className = `${variant === 'primary' ? styles.btnPrimary : styles.btnSecondary}${action.className ? ` ${action.className}` : ''}`;

    if (action.href && !action.onClick) {
        return (
            <Button href={action.href} variant={variant} className={className} icon={action.icon}>
                {action.label}
            </Button>
        );
    }

    return (
        <button
            type={action.type || 'button'}
            form={action.formId}
            className={className}
            onClick={action.onClick ? (e) => action.onClick!(e) : undefined}
            disabled={action.isLoading || action.disabled}
        >
            {action.isLoading ? (
                <>
                    <Spinner size={16} />
                    {action.type === 'submit' ? 'Saving...' : 'Wait...'}
                </>
            ) : (
                <>
                    {action.icon && (
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                            {action.icon}
                        </span>
                    )}
                    <span>{action.label}</span>
                </>
            )}
        </button>
    );
}

/**
 * Shared page header for all dashboard sub-pages: title, subtitle, optional
 * badge, up to two actions (secondary + primary), an optional close button,
 * and an optional children slot for extra header content (tabs, filters).
 *
 * Replaces the old BackButton/SubPageHeader pair — those rendered a
 * back-navigation link; this renders a close (X) button instead. Pass
 * `closeHref` (or `onClose` for a custom/dirty-check handler) to show it.
 */
export default function PageHeader({
    title,
    subtitle,
    badge,
    primaryAction,
    secondaryAction,
    closeHref,
    onClose,
    hideDivider = false,
    children,
    // Deprecated single-action props, mapped onto primaryAction below.
    actionLabel,
    onActionClick,
    actionHref,
    actionIcon,
    actionClassName,
    customAction,
}: PageHeaderProps) {
    const router = useRouter();

    const resolvedPrimaryAction: HeaderAction | undefined = primaryAction || (actionLabel ? {
        label: actionLabel,
        onClick: onActionClick,
        href: actionHref,
        icon: actionIcon,
        className: actionClassName,
    } : undefined);

    const handleClose = () => {
        if (onClose) return onClose();
        if (closeHref) return router.push(closeHref);
    };

    return (
        <header
            className={styles.header}
            style={{
                alignItems: 'center',
                paddingBottom: hideDivider ? '0' : '24px',
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1 className={styles.title} style={{ margin: 0 }}>{title}</h1>
                    {badge && <Badge label={badge.label} variant={badge.variant} />}
                </div>
                {subtitle && <p className={styles.subtitle} style={{ margin: 0 }}>{subtitle}</p>}
                {children}
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {customAction}
                {secondaryAction && renderAction(secondaryAction, 'secondary')}
                {resolvedPrimaryAction && renderAction(resolvedPrimaryAction, 'primary')}
            </div>

            {(closeHref || onClose) && <CloseButton onClick={handleClose} className={styles.headerCloseBtn} />}
        </header>
    );
}
