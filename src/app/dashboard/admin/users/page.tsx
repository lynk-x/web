"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import UserTable, { User } from '@/components/admin/UserTable';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';

// Mock Data
const mockUsers: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'organizer', status: 'active', lastActive: '2 mins ago' },
    { id: '2', name: 'Alice Smith', email: 'alice@business.com', role: 'advertiser', status: 'active', lastActive: '1 hr ago' },
    { id: '3', name: 'Robert Admin', email: 'admin@lynk-x.com', role: 'admin', status: 'active', lastActive: 'Just now' },
    { id: '4', name: 'Sarah User', email: 'sarah@gmail.com', role: 'user', status: 'active', lastActive: '2 days ago' },
    { id: '5', name: 'Mike Spammer', email: 'mike@spam.net', role: 'user', status: 'suspended', lastActive: '5 days ago' },
    { id: '6', name: 'Event Pro Ltd', email: 'contact@eventpro.com', role: 'organizer', status: 'active', lastActive: '3 hrs ago' },
    { id: '7', name: 'Tech Ads Agency', email: 'ads@tech.com', role: 'advertiser', status: 'active', lastActive: '1 day ago' },
    { id: '8', name: 'Jane Doe', email: 'jane@example.com', role: 'user', status: 'active', lastActive: '1 week ago' },
    { id: '9', name: 'Bob Builder', email: 'bob@construction.com', role: 'organizer', status: 'active', lastActive: '2 weeks ago' },
    { id: '10', name: 'Charlie Chef', email: 'charlie@foodie.com', role: 'user', status: 'partially_active', lastActive: '3 weeks ago' },
    { id: '11', name: 'David Developer', email: 'david@code.com', role: 'admin', status: 'active', lastActive: '1 month ago' },
    { id: '12', name: 'Eve Event', email: 'eve@events.com', role: 'organizer', status: 'suspended', lastActive: '2 months ago' },
];

export default function AdminUsersPage() {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic
    const filteredUsers = mockUsers.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedUserIds(new Set()); // Clear selection on filter change
    }, [searchTerm, roleFilter]);

    // Selection Logic
    const handleSelectUser = (id: string) => {
        const newSelected = new Set(selectedUserIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedUserIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedUserIds.size === paginatedUsers.length) {
            setSelectedUserIds(new Set());
        } else {
            const newSelected = new Set(selectedUserIds);
            paginatedUsers.forEach(user => newSelected.add(user.id));
            setSelectedUserIds(newSelected);
        }
    };

    const handleBulkDelete = () => {
        showToast(`Deleting ${selectedUserIds.size} users...`, 'info');
        setTimeout(() => {
            showToast(`Successfully deleted ${selectedUserIds.size} users.`, 'success');
            setSelectedUserIds(new Set());
        }, 1000);
    };

    const handleBulkSuspend = () => {
        showToast(`Suspending ${selectedUserIds.size} users...`, 'info');
        setTimeout(() => {
            showToast(`Successfully suspended ${selectedUserIds.size} users.`, 'success');
            setSelectedUserIds(new Set());
        }, 1000);
    };

    const bulkActions: BulkAction[] = [
        { label: 'Suspend Selected', onClick: handleBulkSuspend },
        { label: 'Delete Selected', onClick: handleBulkDelete, variant: 'danger' }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={adminStyles.title}>User Management</h1>
                    <p className={adminStyles.subtitle}>Monitor and manage platform users, roles, and account statuses.</p>
                </div>
                <button className={adminStyles.btnPrimary}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="22" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Add New User
                </button>
            </header>

            <TableToolbar
                searchPlaceholder="Search by name or email..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <div className={adminStyles.filterGroup}>
                    {['all', 'admin', 'organizer', 'advertiser', 'user'].map((role) => (
                        <button
                            key={role}
                            className={`${adminStyles.chip} ${roleFilter === role ? adminStyles.chipActive : ''}`}
                            onClick={() => setRoleFilter(role)}
                        >
                            {role === 'all' ? 'All Users' : role.charAt(0).toUpperCase() + role.slice(1) + 's'}
                        </button>
                    ))}
                </div>
            </TableToolbar>

            <BulkActionsBar
                selectedCount={selectedUserIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedUserIds(new Set())}
                itemTypeLabel="users"
            />

            <UserTable
                users={paginatedUsers}
                selectedIds={selectedUserIds}
                onSelect={handleSelectUser}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
