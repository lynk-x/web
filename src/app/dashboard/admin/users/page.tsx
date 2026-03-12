"use client";

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
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
import StatCard from '@/components/dashboard/StatCard';
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
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [roleFilter, setRoleFilter] = useState('all');
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 10;

    const initialTab = (searchParams.get('tab') as string) || 'accounts';
    const [activeTab, setActiveTab] = useState<Tab>(
        (['accounts', 'profiles'].includes(initialTab) ? initialTab as 'accounts' | 'organizers' | 'sponsors' : 'accounts') as Tab
    );

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .schema('analytics')
                .from('mv_user_performance')
                .select(`
                    *,
                    profile:user_profile!id (
                        gender,
                        country_code
                    )
                `, { count: 'exact' });

            // Server-side Filtering
            if (searchTerm.trim()) {
                query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,user_name.ilike.%${searchTerm}%`);
            }

            if (roleFilter !== 'all') {
                query = query.eq('role', roleFilter);
            }

            // Pagination
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            const { data, error, count } = await query
                .order('last_active_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            const mappedUsers: User[] = (data || []).map((u: any) => ({
                id: u.id,
                name: u.full_name || u.user_name || 'Unknown User',
                email: u.email || 'no-email@lynk-x.com',
                role: u.role,
                status: u.status,
                lastActive: formatRelativeTime(u.last_active_at),
                isVerified: u.is_verified,
                reportsCount: u.reports_count || 0,
                userName: u.user_name,
                gender: u.profile?.gender,
                countryCode: u.profile?.country_code,
                // business_email, tax_id, registration_number do not exist on the accounts table
                businessEmail: undefined,
                taxId: undefined,
                registrationNumber: undefined
            }));

            setUsers(mappedUsers);
            setTotalCount(count || 0);
        } catch (err: any) {
            showToast('Failed to load user database.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, searchTerm, roleFilter, currentPage]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Update searchTerm if URL changes
    useEffect(() => {
        const search = searchParams.get('search');
        if (search !== null && search !== searchTerm) {
            setSearchTerm(search);
        }
    }, [searchParams]);

    useEffect(() => {
        const tab = searchParams.get('tab') as string;
        if (tab && ['accounts', 'profiles'].includes(tab)) {
            setActiveTab(tab as typeof activeTab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as Tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const handleSelectUser = (id: string) => {
        const newSelected = new Set(selectedUserIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedUserIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedUserIds.size === users.length) {
            setSelectedUserIds(new Set());
        } else {
            const newSelected = new Set(selectedUserIds);
            users.forEach(user => newSelected.add(user.id));
            setSelectedUserIds(newSelected);
        }
    };

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedUserIds(new Set());
    }, [searchTerm, roleFilter]);

    const handleBulkStatusUpdate = async (newStatus: string) => {
        showToast(`Updating ${selectedUserIds.size} users...`, 'info');
        try {
            const isActive = newStatus === 'active';
            const { error } = await supabase.rpc('bulk_update_user_status', {
                user_ids: Array.from(selectedUserIds),
                is_active_val: isActive
            });

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

    const stats = useMemo(() => {
        const total = totalCount;
        const verified = users.filter(u => u.isVerified).length; // This is only for the current page, ideally I'd have a separate count
        const reports = users.reduce((acc, u) => acc + (u.reportsCount || 0), 0);
        
        return { total, verified, reports };
    }, [users, totalCount]);

    return (
        <>
            <div className={adminStyles.statsGrid}>
                <StatCard 
                    label="Total Registered" 
                    value={stats.total} 
                    change="All platform accounts"
                    isLoading={isLoading} 
                />
                <StatCard 
                    label="Verified Today" 
                    value={stats.verified} 
                    change="Identity verified"
                    trend="positive"
                    isLoading={isLoading} 
                />
                <StatCard 
                    label="Active Organizers" 
                    value={users.filter(u => u.role === 'organizer').length} 
                    change="Verified event makers"
                    trend="neutral"
                    isLoading={isLoading} 
                />
                <StatCard 
                    label="User Reports" 
                    value={stats.reports} 
                    change="Requires moderation"
                    trend={stats.reports > 0 ? "negative" : "positive"}
                    isLoading={isLoading} 
                />
            </div>

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
                users={users}
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
