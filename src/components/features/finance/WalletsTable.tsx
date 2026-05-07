"use client";

import React from 'react';
import DataTable from '@/components/shared/DataTable';
import type { AccountWallet } from '@/types/organize';

interface WalletsTableProps {
    data: AccountWallet[];
    isLoading: boolean;
}

export default function WalletsTable({ data, isLoading }: WalletsTableProps) {
    const columns = [
        {
            header: 'Reference',
            render: (wallet: AccountWallet) => (
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '13px', opacity: 0.8 }}>
                    {wallet.reference}
                </div>
            )
        },
        {
            header: 'Currency',
            render: (wallet: AccountWallet) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <div style={{
                        width: '32px', height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px'
                    }}>
                        {wallet.currency}
                    </div>
                </div>
            )
        },
        {
            header: 'Available Balance',
            render: (wallet: AccountWallet) => {
                return (
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: wallet.currency }).format(wallet.balance)}
                    </div>
                );
            }
        },
        {
            header: 'Reserved (Escrow)',
            render: (wallet: AccountWallet) => {
                return (
                    <div style={{ opacity: 0.8, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: wallet.currency }).format(wallet.escrow_balance || 0)}
                    </div>
                );
            }
        },
        {
            header: 'Last Updated',
            render: (wallet: AccountWallet) => (
                <div style={{ opacity: 0.7, fontSize: '13px' }}>
                    {new Date(wallet.updated_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                    })}
                </div>
            )
        }
    ];

    return (
        <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden' }}>
            <DataTable
                data={data}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No balances available in this wallet."
            />
        </div>
    );
}
