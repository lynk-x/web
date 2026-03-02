"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';
import adminStyles from '../page.module.css';
import UserTable, { User } from '@/components/admin/users/UserTable';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import FilterGroup from '@/components/dashboard/FilterGroup';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import { formatRelativeTime } from '@/utils/format';
import Tabs from '@/components/dashboard/Tabs';

type Tab = 'accounts' | 'profiles';

function UsersContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();

    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const initialTab = (searchParams.get('tab') as any) || 'accounts';
    const [activeTab, setActiveTab] = useState<Tab>(
        (['accounts', 'profiles'].includes(initialTab) ? initialTab : 'accounts') as Tab
    );

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('mv_user_performance')
                    .select(`
                        *,
                        profile:profiles!id (
                            gender,
                            country_code
                        ),
                        members:account_members (
                            account:accounts (
                                business_email,
                                tax_id,
                                registration_number
                            )
                        )
                    `)
                    .order('last_active_at', { ascending: false });

                if (error) throw error;

                const mappedUsers: User[] = (data || []).map((u: any) => ({
                    id: u.id,
                    name: u.full_name || u.user_name || 'Unknown User',
                    email: u.email || 'no-email@lynk-x.com',
                    role: u.role,
                    status: u.status,
                    lastActive: formatRelativeTime(u.last_active_at),
                    isVerified: u.is_verified,
                    subscriptionTier: u.subscription_tier,
                    reportsCount: u.reports_count || 0,
                    // New fields from profiles join
                    userName: u.user_name,
                    gender: u.profile?.gender,
                    countryCode: u.profile?.country_code,
                    // New fields from accounts join
                    businessEmail: u.members?.[0]?.account?.business_email,
                    taxId: u.members?.[0]?.account?.tax_id,
                    registrationNumber: u.members?.[0]?.account?.registration_number
                }));

                setUsers(mappedUsers);
            } catch (err: any) {
                showToast('Failed to load user database.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [supabase, showToast]);

    useEffect(() => {
        const tab = searchParams.get('tab') as any;
        if (tab && ['accounts', 'profiles'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as Tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    // Filter Logic
    const filteredUsers = users.filter(user => {
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
        setSelectedUserIds(new Set());
    }, [searchTerm, roleFilter]);

    // Selection Logic
    const handleSelectUser = (id: string) => {
        const newSelected = new Set(selectedUserIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
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

    const handleBulkStatusUpdate = async (newStatus: string) => {
        showToast(`Updating ${selectedUserIds.size} users...`, 'info');
        try {
            const isActive = newStatus === 'active';
            const { error } = await supabase
                .from('profiles')
                .update({ is_active: isActive, updated_at: new Date().toISOString() })
                .in('id', Array.from(selectedUserIds));

            if (error) throw error;

            showToast(`Users ${newStatus} successfully.`, 'success');
            setUsers(prev => prev.map(u =>
                selectedUserIds.has(u.id) ? { ...u, status: newStatus as any } : u
            ));
            setSelectedUserIds(new Set());
        } catch (err) {
            showToast('Failed to update accounts.', 'error');
        }
    };

    const bulkActions: BulkAction[] = [
        { label: 'Activate Selection', onClick: () => handleBulkStatusUpdate('active'), variant: 'success' },
        { label: 'Suspend Selection', onClick: () => handleBulkStatusUpdate('suspended'), variant: 'danger' }
    ];

    return (
        <>
            <Tabs
                options={[
                    { id: 'accounts', label: 'Accounts' },
                    { id: 'profiles', label: 'Profiles' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            <TableToolbar
                searchPlaceholder="Search by name or email..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <FilterGroup
                    options={[
                        { value: 'all', label: 'All Users' },
                        { value: 'admin', label: 'Admins' },
                        { value: 'organizer', label: 'Organizers' },
                        { value: 'advertiser', label: 'Advertisers' },
                        { value: 'attendee', label: 'Attendees' },
                        { value: 'platform', label: 'Platform' },
                    ]}
                    currentValue={roleFilter}
                    onChange={setRoleFilter}
                />
            </TableToolbar>

            {activeTab === 'accounts' && (
                <BulkActionsBar
                    selectedCount={selectedUserIds.size}
                    actions={bulkActions}
                    onCancel={() => setSelectedUserIds(new Set())}
                    itemTypeLabel="users"
                />
            )}

            <UserTable
                users={paginatedUsers}
                isLoading={isLoading}
                selectedIds={selectedUserIds}
                onSelect={handleSelectUser}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                view={activeTab}
            />
        </>
    );
}

export default function AdminUsersPage() {
    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="User Management"
                subtitle="Monitor and manage platform users, roles, and account statuses."
                actionLabel="Add New User"
                actionHref="/dashboard/admin/users/create"
                actionIcon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="22" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                }
            />

            <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>Loading Users...</div>}>
                <UsersContent />
            </Suspense>
        </div>
    );
}
