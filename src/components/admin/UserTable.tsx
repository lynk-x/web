"use client";

import React from 'react';
import styles from './UserTable.module.css';
import adminStyles from '../../app/dashboard/admin/page.module.css';
import TableCheckbox from '../shared/TableCheckbox';
import Badge, { BadgeVariant } from '../shared/Badge';
import TableRowActions, { ActionItem } from '../shared/TableRowActions';
import Pagination from '../shared/Pagination';
import { useToast } from '@/components/ui/Toast';

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'organizer' | 'advertiser' | 'user';
    status: 'active' | 'suspended' | 'partially_active';
    lastActive: string;
}

interface UserTableProps {
    users: User[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    // Pagination props
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const UserTable: React.FC<UserTableProps> = ({
    users,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange
}) => {
    const { showToast } = useToast();
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

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

    const formatStatus = (status: string) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const allSelected = users.length > 0 && selectedIds?.size === users.length;
    const isIndeterminate = (selectedIds?.size || 0) > 0 && !allSelected;

    const getUserActions = (user: User): ActionItem[] => [
        {
            label: 'View Details',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
            onClick: () => showToast(`Opening details for ${user.name}...`, 'info')
        },
        {
            label: 'Edit User',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => showToast(`Opening edit mode for ${user.name}...`, 'info')
        },
        {
            label: 'Reset Password',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
            onClick: () => {
                showToast(`Sending reset link to ${user.email}...`, 'info');
                setTimeout(() => showToast('Password reset link sent.', 'success'), 1500);
            }
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
                setTimeout(() => showToast(`User status updated.`, 'success'), 1000);
            }
        },
        {
            label: 'Delete User',
            variant: 'danger',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
            onClick: () => {
                showToast(`Deleting user ${user.name}...`, 'info');
                setTimeout(() => showToast('User deleted successfully.', 'success'), 1500);
            }
        }
    ];

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{ width: '40px' }}>
                            <TableCheckbox
                                checked={allSelected}
                                onChange={() => onSelectAll && onSelectAll()}
                                indeterminate={isIndeterminate}
                                disabled={!onSelectAll}
                            />
                        </th>
                        <th>User</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Active</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id} className={selectedIds?.has(user.id) ? styles.rowSelected : ''}>
                            <td>
                                <TableCheckbox
                                    checked={selectedIds?.has(user.id) || false}
                                    onChange={() => onSelect && onSelect(user.id)}
                                />
                            </td>
                            <td>
                                <div className={styles.userInfo}>
                                    <div className={styles.userAvatar}>
                                        {getInitials(user.name)}
                                    </div>
                                    <div className={styles.userDetails}>
                                        <span className={styles.userName}>{user.name}</span>
                                        <span className={styles.userEmail}>{user.email}</span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <Badge
                                    label={user.role}
                                    variant={getRoleVariant(user.role)}
                                />
                            </td>
                            <td>
                                <Badge
                                    label={formatStatus(user.status)}
                                    variant={getStatusVariant(user.status)}
                                    showDot
                                />
                            </td>
                            <td>{user.lastActive}</td>
                            <td>
                                <div className={styles.actions}>
                                    <TableRowActions actions={getUserActions(user)} />
                                </div>
                            </td>
                        </tr>
                    ))}
                    {users.length === 0 && (
                        <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '32px', opacity: 0.5 }}>
                                No users found matching criteria.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {onPageChange && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                />
            )}
        </div>
    );
};

export default UserTable;
