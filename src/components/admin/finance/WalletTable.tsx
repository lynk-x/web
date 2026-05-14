"use client";

import React from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import type { ActionItem } from '@/types/shared';
import { formatCurrency } from '@/utils/format';

export interface AdminWallet {
    account_id: string;
    account_name: string;
    account_type: string;
    reference: string;
    currency: string;
    cash_balance: number;
    escrow_balance: number;
    credit_balance: number;
    status: string;
}

interface WalletTableProps {
    data: AdminWallet[];
    isLoading: boolean;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function WalletTable({
    data,
    isLoading,
    currentPage,
    totalPages,
    onPageChange
}: WalletTableProps) {

    const getStatusVariant = (status: string): BadgeVariant => {
        switch (status?.toLowerCase()) {
            case 'active': return 'success';
            case 'frozen': return 'error';
            case 'restricted': return 'warning';
            default: return 'neutral';
        }
    };

    const getAccountTypeVariant = (type: string): BadgeVariant => {
        switch (type?.toLowerCase()) {
            case 'organizer': return 'info';
            case 'user': return 'neutral';
            case 'service_provider': return 'success';
            default: return 'subtle';
        }
    };

    const columns: Column<AdminWallet>[] = [
        {
            header: 'Reference',
            render: (w) => (
                <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 500 }}>
                    {w.reference}
                </div>
            )
        },
        {
            header: 'Account Name',
            render: (w) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{w.account_name}</div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>{w.account_id}</div>
                </div>
            )
        },
        {
            header: 'Account Type',
            render: (w) => <Badge label={w.account_type.replace(/_/g, ' ')} variant={getAccountTypeVariant(w.account_type)} />
        },
        {
            header: 'Currency',
            render: (w) => (
                <div style={{ fontWeight: 700, fontSize: '12px', opacity: 0.8 }}>
                    {w.currency}
                </div>
            )
        },
        {
            header: 'Cash Balance',
            render: (w) => (
                <div style={{ fontWeight: 600, color: 'var(--color-brand-primary)' }}>
                    {formatCurrency(w.cash_balance, w.currency)}
                </div>
            )
        },
        {
            header: 'Escrow',
            render: (w) => (
                <div style={{ opacity: 0.7 }}>
                    {formatCurrency(w.escrow_balance, w.currency)}
                </div>
            )
        },
        {
            header: 'Credit',
            render: (w) => (
                <div style={{ opacity: 0.7 }}>
                    {formatCurrency(w.credit_balance, w.currency)}
                </div>
            )
        },
        {
            header: 'Status',
            render: (w) => <Badge label={w.status} variant={getStatusVariant(w.status)} />
        }
    ];

    const getActions = (w: AdminWallet): ActionItem[] => [
        {
            label: 'View Transactions',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
            onClick: () => {
                // Future: Navigate to transactions filtered by account
            }
        },
        {
            label: w.status === 'active' ? 'Freeze Wallet' : 'Unfreeze Wallet',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
            onClick: () => {
                // Future: Trigger status change RPC
            },
            variant: w.status === 'active' ? 'danger' : 'success'
        }
    ];

    return (
        <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden' }}>
            <DataTable
                data={data.map(w => ({ ...w, id: `${w.account_id}_${w.currency}` }))}
                columns={columns}
                getActions={getActions}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                emptyMessage="No account wallets found."
            />
        </div>
    );
}
