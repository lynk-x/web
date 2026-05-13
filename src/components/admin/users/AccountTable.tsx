"use client";

import React from 'react';
import styles from './UserTable.module.css';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { formatString, formatCurrency } from '@/utils/format';
import type { ActionItem } from '../../shared/TableRowActions';
import AccountMembersDrawer from './AccountMembersDrawer';
import AccountGovernanceDrawer from './AccountGovernanceDrawer';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import type { AdminAccount } from '@/types/admin';
import BalanceAdjustmentModal from './BalanceAdjustmentModal';

interface AccountTableProps {
    accounts: AdminAccount[];
    isLoading?: boolean;
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    onRefresh?: () => void;
}

const getRoleVariant = (type: string): BadgeVariant => {
    switch (type) {
        case 'platform': return 'primary';
        case 'organizer': return 'success';
        case 'advertiser': return 'info';
        case 'pulse_user': return 'warning';
        default: return 'neutral';
    }
};

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'active': return 'success';
        case 'suspended':
        case 'temporarily_suspended': return 'warning';
        case 'permanently_suspended':
        case 'frozen': return 'error';
        default: return 'neutral';
    }
};

const AccountTable: React.FC<AccountTableProps> = ({
    accounts,
    isLoading = false,
    selectedIds,
    onSelect,
    onSelectAll,
    totalPages = 1,
    currentPage = 1,
    onPageChange,
    onRefresh,
}) => {
    const supabase = React.useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const router = useRouter();
    const [selectedAccountForMembers, setSelectedAccountForMembers] = React.useState<AdminAccount | null>(null);
    const [selectedAccountForGovernance, setSelectedAccountForGovernance] = React.useState<AdminAccount | null>(null);
    const [selectedAccountForBalance, setSelectedAccountForBalance] = React.useState<AdminAccount | null>(null);

    const columns: Column<AdminAccount>[] = [
        {
            header: 'Reference',
            render: (acc) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{acc.display_name}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', opacity: 0.6 }}>{acc.reference}</span>
                </div>
            ),
        },
        {
            header: 'Country',
            render: (acc) => <span style={{ fontSize: '13px', fontWeight: 600 }}>{acc.country_code || 'KE'}</span>,
        },
        {
            header: 'Type',
            render: (acc) => <Badge label={acc.type} variant={getRoleVariant(acc.type)} />,
        },
        {
            header: 'Members',
            render: (acc) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{acc.member_count}</span>
                    <span style={{ fontSize: '11px', opacity: 0.5 }}>Users</span>
                </div>
            ),
        },
        {
            header: 'Identity',
            render: (acc) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>
                        {acc.kyc_tier ? acc.kyc_tier.replace(/_/g, ' ').toUpperCase() : 'NO TIER'}
                    </span>
                    <Badge 
                        label={acc.is_verified ? 'VERIFIED' : 'UNVERIFIED'} 
                        variant={acc.is_verified ? 'success' : 'neutral'} 
                    />
                </div>
            ),
        },
        {
            header: 'Balances',
            render: (acc) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', opacity: 0.5, width: '35px' }}>CASH:</span>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{formatCurrency(acc.cash_balance)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', opacity: 0.5, width: '35px' }}>PROMO:</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-primary)' }}>{formatCurrency(acc.credit_balance)}</span>
                    </div>
                </div>
            ),
        },
        {
            header: 'Status',
            render: (acc) => (
                <Badge label={formatString(acc.status)} variant={getStatusVariant(acc.status)} showDot />
            ),
        },
    ];

    const getActions = (acc: AdminAccount): ActionItem[] => [
        {
            label: 'Manage Members',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
            onClick: () => setSelectedAccountForMembers(acc),
        },
        {
            label: 'View Ledger',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
            onClick: () => router.push(`/dashboard/admin/finance?accountId=${acc.id}`),
        },
        {
            label: 'See Reports',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
            onClick: () => router.push(`/dashboard/admin/moderation?accountId=${acc.id}`),
        },
        {
            label: 'Adjust Balance',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>,
            onClick: () => setSelectedAccountForBalance(acc),
        },
        {
            divider: true,
        },
        {
            label: acc.status === 'active' ? 'Freeze Account' : 'Unfreeze Account',
            variant: acc.status === 'active' ? 'danger' : 'success',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>,
            onClick: async () => {
                const newStatus = acc.status === 'active' ? 'frozen' : 'active';
                const actionLabel = acc.status === 'active' ? 'freeze' : 'unfreeze';
                
                showToast(`${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)}ing ${acc.display_name}...`, 'info');
                
                try {
                    const { error } = await supabase.rpc('bulk_update_account_status', {
                        p_account_ids: [acc.id],
                        p_status: newStatus,
                        p_reason: `Account ${actionLabel}d via Admin Registry.`
                    });

                    if (error) throw error;

                    showToast(`${acc.display_name} successfully ${actionLabel}d.`, 'success');
                    onRefresh?.();
                } catch (err) {
                    showToast(`Failed to ${actionLabel} account.`, 'error');
                }
            },
        },
        {
            label: acc.status === 'active' ? 'Suspend Account' : 'Unsuspend Account',
            variant: acc.status === 'active' ? 'danger' : 'success',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>,
            onClick: async () => {
                const newStatus = acc.status === 'active' ? 'temporarily_suspended' : 'active';
                const actionLabel = acc.status === 'active' ? 'suspend' : 'unsuspend';
                
                showToast(`${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)}ing ${acc.display_name}...`, 'info');
                
                try {
                    const { error } = await supabase.rpc('bulk_update_account_status', {
                        p_account_ids: [acc.id],
                        p_status: newStatus,
                        p_reason: `Account ${actionLabel}ed via Admin Registry.`
                    });

                    if (error) throw error;

                    showToast(`${acc.display_name} successfully ${actionLabel}ed.`, 'success');
                    onRefresh?.();
                } catch (err) {
                    showToast(`Failed to ${actionLabel} account.`, 'error');
                }
            },
        },
    ];

    return (
        <>
            <DataTable<AdminAccount>
                data={accounts}
                columns={columns}
                getActions={getActions}
                isLoading={isLoading}
                selectedIds={selectedIds}
                onSelect={onSelect}
                onSelectAll={onSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                emptyMessage="No accounts found matching criteria."
            />

            {selectedAccountForMembers && (
                <AccountMembersDrawer 
                    account={selectedAccountForMembers} 
                    onClose={() => setSelectedAccountForMembers(null)} 
                />
            )}

            {selectedAccountForGovernance && (
                <AccountGovernanceDrawer
                    account={selectedAccountForGovernance}
                    onClose={() => setSelectedAccountForGovernance(null)}
                />
            )}

            {selectedAccountForBalance && (
                <BalanceAdjustmentModal
                    account={selectedAccountForBalance}
                    onClose={() => setSelectedAccountForBalance(null)}
                    onSuccess={() => onRefresh?.()}
                />
            )}
        </>
    );
};

export default AccountTable;
