"use client";

import React from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import type { BadgeVariant, ActionItem } from '@/types/shared';
import { formatDate, formatCurrency } from '@/utils/format';

export interface Subscription {
    id: string;
    reference: string;
    account_name: string;
    account_id: string;
    plan_name: string;
    plan_id: string;
    currency: string;
    amount: number;
    reporting_currency?: string;
    reporting_amount?: number;
    starts_at: string;
    ends_at: string | null;
    status: string;
}

interface SubscriptionTableProps {
    data: Subscription[];
    isLoading?: boolean;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPause?: (id: string) => void;
    onResume?: (id: string) => void;
    onChangePlan?: (id: string) => void;
    onResendInvoice?: (id: string) => void;
    onCancel?: (id: string) => void;
}

export default function SubscriptionTable({
    data,
    isLoading,
    currentPage,
    totalPages,
    onPageChange,
    onPause,
    onResume,
    onChangePlan,
    onResendInvoice,
    onCancel
}: SubscriptionTableProps) {
    const columns: Column<Subscription>[] = [
        {
            header: 'Reference',
            render: (row) => <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{row.reference}</span>
        },
        {
            header: 'Account',
            render: (row) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500 }}>{row.account_name}</span>
                    <span style={{ fontSize: '11px', opacity: 0.5 }}>{row.account_id}</span>
                </div>
            )
        },
        {
            header: 'Plan',
            render: (row) => <Badge variant="info" label={row.plan_name} />
        },
        {
            header: 'Currency',
            render: (row) => <span style={{ fontWeight: 500 }}>{row.currency}</span>
        },
        {
            header: 'Amount',
            render: (row) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>
                        {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {row.reporting_amount && row.reporting_currency && row.reporting_currency !== row.currency && (
                        <span style={{ fontSize: '11px', opacity: 0.5 }}>
                            {formatCurrency(Number(row.reporting_amount), row.reporting_currency)}
                        </span>
                    )}
                </div>
            )
        },
        {
            header: 'Starts At',
            render: (row) => formatDate(row.starts_at)
        },
        {
            header: 'Ends At',
            render: (row) => row.ends_at ? formatDate(row.ends_at) : <span style={{ opacity: 0.4 }}>Never</span>
        },
        {
            header: 'Status',
            render: (row) => {
                let variant: BadgeVariant = 'neutral';
                switch (row.status.toLowerCase()) {
                    case 'active': variant = 'success'; break;
                    case 'past_due': variant = 'warning'; break;
                    case 'canceled': 
                    case 'cancelled': variant = 'error'; break;
                    case 'trialing': variant = 'info'; break;
                    case 'paused': variant = 'subtle'; break;
                }
                return <Badge variant={variant} label={row.status.replace(/_/g, ' ')} />;
            }
        }
    ];

    const getActions = (row: Subscription): ActionItem[] => {
        const actions: ActionItem[] = [];

        if (row.status === 'paused') {
            if (onResume) actions.push({ label: 'Resume Subscription', onClick: () => onResume(row.id) });
        } else if (['active', 'trialing', 'past_due'].includes(row.status)) {
            if (onPause) actions.push({ label: 'Pause Subscription', onClick: () => onPause(row.id) });
        }

        if (onChangePlan) actions.push({ label: 'Change Plan', onClick: () => onChangePlan(row.id) });
        if (onResendInvoice) actions.push({ label: 'Resend Latest Invoice', onClick: () => onResendInvoice(row.id) });

        if (['active', 'trialing', 'past_due', 'paused'].includes(row.status)) {
            actions.push({ divider: true });
            if (onCancel) actions.push({ label: 'Cancel Subscription', variant: 'danger', onClick: () => onCancel(row.id) });
        }

        return actions;
    };

    return (
        <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            getActions={getActions}
            emptyMessage="No subscriptions found."
        />
    );
}
