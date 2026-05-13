"use client";

import React from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import type { BadgeVariant } from '@/types/shared';
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
}

export default function SubscriptionTable({
    data,
    isLoading,
    currentPage,
    totalPages,
    onPageChange
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
                <span style={{ fontWeight: 600 }}>
                    {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
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
                    case 'canceled': variant = 'error'; break;
                    case 'trialing': variant = 'info'; break;
                }
                return <Badge variant={variant} label={row.status.replace(/_/g, ' ')} />;
            }
        }
    ];

    return (
        <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="No subscriptions found."
        />
    );
}
