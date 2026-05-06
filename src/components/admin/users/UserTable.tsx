"use client";

import React from 'react';
import styles from './UserTable.module.css';
import DataTable, { Column } from '../../shared/DataTable';
import { useRouter } from 'next/navigation';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString, getInitials } from '@/utils/format';
import type { ActionItem } from '../../shared/TableRowActions';
import AccountMembersDrawer from './AccountMembersDrawer';
import AccountGovernanceDrawer from './AccountGovernanceDrawer';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { User } from '@/types/admin';
import type { User } from '@/types/admin';

interface UserTableProps {
    users: User[];
    isLoading?: boolean;
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    view?: 'accounts' | 'profiles';
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

/**
 * Maps `user_type` schema enum values to badge colour variants.
 * Covers: admin | organizer | advertiser | attendee | platform
 */
const getRoleVariant = (role: string): BadgeVariant => {
    switch (role) {
        case 'admin': return 'primary';
        case 'organizer': return 'success';
        case 'advertiser': return 'info';
        case 'platform': return 'warning';
        default: return 'neutral'; // attendee
    }
};

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'active': return 'success';
        case 'temporarily_suspended': return 'warning';
        case 'permanently_suspended': return 'error';
        default: return 'neutral';
    }
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Admin user management table.
 * Displays user info, roles, statuses, and provides row-level actions.
 */
const UserTable: React.FC<UserTableProps> = ({
    users,
    isLoading = false,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    view = 'accounts',
}) => {
    const { showToast } = useToast();
    const router = useRouter();
    const [selectedAccountForMembers, setSelectedAccountForMembers] = React.useState<User | null>(null);
    const [selectedAccountForGovernance, setSelectedAccountForGovernance] = React.useState<User | null>(null);

    /** Column definitions for the user table. */
    const columns: Column<User>[] = [
        {
            header: 'Country',
            render: (user) => <span style={{ fontSize: '13px', fontWeight: 600 }}>{user.countryCode || 'KE'}</span>,
        },
        {
            header: 'Reference',
            render: (user) => <span style={{ fontFamily: 'monospace', fontSize: '12px', opacity: 0.6 }}>#{user.id.slice(0, 8).toUpperCase()}</span>,
        },
        {
            header: 'Type',
            render: (user) => <Badge label={user.role} variant={getRoleVariant(user.role)} />,
        },
        {
            header: 'Users',
            render: (user) => (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--color-brand-primary)', 
                        color: 'black',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: '2px solid var(--color-interface-surface)',
                        boxShadow: '0 0 0 1px var(--color-interface-outline)'
                    }}>
                        {getInitials(user.name)}
                    </div>
                    {/* Mocking a second avatar for 'overlapping' look if it's an org/admin */}
                    {(user.role === 'admin' || user.role === 'platform') && (
                        <div style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '50%', 
                            backgroundColor: 'var(--color-brand-secondary)', 
                            color: 'black',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            marginLeft: '-10px',
                            border: '2px solid var(--color-interface-surface)',
                            boxShadow: '0 0 0 1px var(--color-interface-outline)'
                        }}>
                            +1
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: 'KYC Tier',
            render: (user) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{user.kycTier || 'Tier 0'}</span>
                    <span style={{ fontSize: '10px', opacity: 0.5 }}>{user.isVerified ? 'Verified' : 'Pending'}</span>
                </div>
            ),
        },
        {
            header: 'Status',
            render: (user) => (
                <Badge label={formatString(user.status)} variant={getStatusVariant(user.status)} showDot />
            ),
        },
    ];

    /** Row-level actions for the user action menu. */
    const getActions = (user: User): ActionItem[] => [
        {
            label: 'View Members',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
            onClick: () => setSelectedAccountForMembers(user),
        },
        {
            label: 'KYC & Wallets',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>,
            onClick: () => setSelectedAccountForGovernance(user),
        },
        {
            type: 'divider' as const,
        },
        {
            label: user.status === 'active' ? 'Suspend Account' : 'Activate Account',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>,
            onClick: () => showToast(`Toggling suspension for ${user.name}`, 'info'),
        },
        {
            label: 'Lock Account',
            variant: 'danger' as const,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
            onClick: () => showToast(`CRITICAL: Locking account ${user.id.slice(0, 8)}`, 'error'),
        },
    ];

    return (
        <>
            <DataTable<User>
                data={users}
                columns={columns}
                getActions={getActions}
                isLoading={isLoading}
                selectedIds={selectedIds}
                onSelect={onSelect}
                onSelectAll={onSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                emptyMessage="No users found matching criteria."
            />

            <AccountMembersDrawer 
                account={selectedAccountForMembers} 
                onClose={() => setSelectedAccountForMembers(null)} 
            />

            <AccountGovernanceDrawer
                account={selectedAccountForGovernance}
                onClose={() => setSelectedAccountForGovernance(null)}
            />
        </>
    );
};

export default UserTable;
