"use client";

import React from 'react';
import styles from './UserTable.module.css';
import DataTable, { Column } from '../../shared/DataTable';
import { useRouter } from 'next/navigation';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString, getInitials } from '@/utils/format';
import type { ActionItem } from '../../shared/TableRowActions';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { User } from '@/types/admin';
import type { User } from '@/types/admin';

interface UserTableProps {
    users: User[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

const getRoleVariant = (role: string): BadgeVariant => {
    switch (role) {
        case 'admin': return 'primary';
        case 'organizer': return 'success';
        case 'advertiser': return 'info';
        default: return 'neutral';
    }
};

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'active': return 'success';
        case 'suspended': return 'error';
        case 'partially_active': return 'warning';
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
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const { showToast } = useToast();
    const router = useRouter();

    /** Column definitions for the user table. */
    const columns: Column<User>[] = [
        {
            header: 'User',
            render: (user) => (
                <div className={styles.userInfo}>
                    <div className={styles.userAvatar}>{getInitials(user.name)}</div>
                    <div className={styles.userDetails}>
                        <span className={styles.userName}>{user.name}</span>
                        <span className={styles.userEmail}>{user.email}</span>
                    </div>
                </div>
            ),
        },
        {
            header: 'Role',
            render: (user) => <Badge label={user.role} variant={getRoleVariant(user.role)} />,
        },
        {
            header: 'Status',
            render: (user) => (
                <Badge label={formatString(user.status)} variant={getStatusVariant(user.status)} showDot />
            ),
        },
        {
            header: 'Last Active',
            render: (user) => user.lastActive,
        },
    ];

    /** Row-level actions for the user action menu. */
    const getActions = (user: User): ActionItem[] => [
        {
            label: 'View Details',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
            onClick: () => showToast(`Opening details for ${user.name}...`, 'info'),
        },
        {
            label: 'Edit User',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => router.push(`/dashboard/admin/users/${user.id}/edit`),
        },
        {
            label: 'Reset Password',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
            onClick: () => {
                showToast(`Sending reset link to ${user.email}...`, 'info');
                setTimeout(() => showToast('Password reset link sent.', 'success'), 1500);
            },
        },
        {
            label: user.status === 'active' ? 'Suspend User' : 'Activate User',
            icon: user.status === 'active' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
            ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            ),
            onClick: () => {
                const action = user.status === 'active' ? 'Suspending' : 'Activating';
                showToast(`${action} ${user.name}...`, 'info');
                setTimeout(() => showToast('User status updated.', 'success'), 1000);
            },
        },
        {
            label: 'Delete User',
            variant: 'danger',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
            onClick: () => {
                showToast(`Deleting user ${user.name}...`, 'info');
                setTimeout(() => showToast('User deleted successfully.', 'success'), 1500);
            },
        },
    ];

    return (
        <DataTable<User>
            data={users}
            columns={columns}
            getActions={getActions}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="No users found matching criteria."
        />
    );
};

export default UserTable;
