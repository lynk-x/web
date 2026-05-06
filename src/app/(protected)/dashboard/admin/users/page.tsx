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
import { useDebounce } from '@/hooks/useDebounce';

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
    const [summary, setSummary] = useState<any>(null);

    const debouncedSearch = useDebounce(searchTerm, 500);
    const itemsPerPage = 20;



    const fetchSummary = useCallback(async () => {
        const { data, error } = await supabase.rpc('admin_stat_summary');
        if (!error && data) setSummary(data);
    }, [supabase]);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_user_performance', {
                p_search: debouncedSearch.trim(),
                p_role: roleFilter,
                p_offset: (currentPage - 1) * itemsPerPage,
                p_limit: itemsPerPage
            });

            if (error) throw error;

            const mappedUsers: User[] = (data || []).map((u: any) => ({
                id: u.id,
                name: u.full_name || u.user_name || 'Unknown User',
                email: u.email || 'no-email@lynk-x.com',
                role: u.role,
                status: u.status,
                lastActive: formatRelativeTime(u.last_active_at),
                isVerified: u.is_verified,
                kycTier: u.kyc_tier,
                reportsCount: u.reports_count || 0,
                userName: u.user_name,
                countryCode: u.country_code,
                businessEmail: undefined,
                taxId: undefined,
                registrationNumber: undefined
            }));

            setUsers(mappedUsers);
            setTotalCount(data?.[0]?.total_count || 0);
        } catch (err: unknown) {
            showToast('Failed to load user database.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, debouncedSearch, roleFilter, currentPage]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // Update searchTerm if URL changes
    useEffect(() => {
        const search = searchParams.get('search');
        if (search !== null && search !== searchTerm) {
            setSearchTerm(search);
        }
    }, [searchParams]);



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
    }, [debouncedSearch, roleFilter]);

    const handleBulkStatusUpdate = async (newStatus: string) => {
        showToast(`Updating ${selectedUserIds.size} users...`, 'info');
        try {
            const isActive = newStatus === 'active';
            const { error } = await supabase.rpc('bulk_update_user_status', {
                user_ids: Array.from(selectedUserIds),
                new_status: newStatus
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
        { label: 'Suspend Selection', onClick: () => handleBulkStatusUpdate('temporarily_suspended'), variant: 'danger' }
    ];

    return (
        <>
            <div className={adminStyles.statsGrid}>
                <StatCard 
                    label="Total Registered" 
                    value={summary?.total_users || 0} 
                    change="All platform accounts"
                    isLoading={isLoading} 
                />
                <StatCard 
                    label="Verified Users" 
                    value={summary?.total_verified_users || 0} 
                    change="Identity verified"
                    trend="positive"
                    isLoading={isLoading} 
                />
                <StatCard 
                    label="Active Organizers" 
                    value={summary?.total_organizers || 0} 
                    change="Verified event makers"
                    trend="neutral"
                    isLoading={isLoading} 
                />
                <StatCard 
                    label="Pending Reports" 
                    value={summary?.total_reports_count || 0} 
                    change="Requires moderation"
                    trend={(summary?.total_reports_count || 0) > 0 ? "negative" : "positive"}
                    isLoading={isLoading} 
                />
            </div>



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

            <BulkActionsBar
                selectedCount={selectedUserIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedUserIds(new Set())}
                itemTypeLabel="users"
            />

            <UserTable
                users={users}
                isLoading={isLoading}
                selectedIds={selectedUserIds}
                onSelect={handleSelectUser}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                view="accounts"
            />
        </>
    );
}

export default function AdminUsersPage() {
    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Identity Management"
                subtitle="Monitor and manage platform identities, kyc verification levels, and roles."
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
