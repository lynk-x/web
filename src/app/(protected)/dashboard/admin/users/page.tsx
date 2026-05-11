"use client";

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import AccountTable from '@/components/admin/users/AccountTable';
import TableToolbar from '@/components/shared/TableToolbar';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import StatCard from '@/components/dashboard/StatCard';
import { useDebounce } from '@/hooks/useDebounce';
import KYCTab from '@/components/admin/users/KYCTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import type { AdminAccount } from '@/types/admin';

function AccountsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();

    const [accounts, setAccounts] = useState<AdminAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [summary, setSummary] = useState<any>(null);

    const debouncedSearch = useDebounce(searchTerm, 500);
    const itemsPerPage = 20;

    const fetchSummary = useCallback(async () => {
        const { data, error } = await supabase.rpc('admin_stat_summary');
        if (!error && data) setSummary(data);
    }, [supabase]);

    const fetchAccounts = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_accounts', {
                p_search: debouncedSearch.trim(),
                p_type: typeFilter,
                p_status: statusFilter,
                p_offset: (currentPage - 1) * itemsPerPage,
                p_limit: itemsPerPage
            });

            if (error) throw error;

            setAccounts(data || []);
            setTotalCount(data?.[0]?.total_count || 0);
        } catch (err: any) {
            showToast('Failed to load accounts database.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, debouncedSearch, typeFilter, statusFilter, currentPage]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, typeFilter, statusFilter]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    return (
        <div className={sharedStyles.container}>
            <PageHeader 
                title="Identity & Compliance" 
                subtitle="Manage organizational accounts, KYC status, and system access." 
            />

            <div className={sharedStyles.statsGrid}>
                <StatCard
                    label="Total Accounts"
                    value={summary?.users?.total || 0}
                    change="Platform entities"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Pending KYC"
                    value={summary?.users?.kyc_pending || 0}
                    change="Verifications needed"
                    trend="negative"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Growth (30d)"
                    value={summary?.users?.growth_30d || 0}
                    change="New accounts"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Churn (30d)"
                    value={summary?.users?.churn_30d || 0}
                    change="Deleted accounts"
                    trend="negative"
                    isLoading={isLoading}
                />
            </div>

            <Tabs defaultValue="accounts" className={styles.tabs}>
                <TabsList>
                    <TabsTrigger value="accounts">Accounts Database</TabsTrigger>
                    <TabsTrigger value="kyc">KYC Workspace</TabsTrigger>
                </TabsList>

                <TabsContent value="accounts">
                    <TableToolbar 
                        searchPlaceholder="Search by name, reference or owner email..." 
                        searchValue={searchTerm} 
                        onSearchChange={setSearchTerm}
                    >
                        <select 
                            className={adminStyles.select}
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="organizer">Organizers</option>
                            <option value="advertiser">Advertisers</option>
                            <option value="attendee">Attendees</option>
                            <option value="pulse_user">Pulse Users</option>
                            <option value="platform">Platform</option>
                        </select>

                        <select 
                            className={adminStyles.select}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="frozen">Frozen</option>
                        </select>
                    </TableToolbar>

                    <AccountTable 
                        accounts={accounts}
                        isLoading={isLoading}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        onRefresh={fetchAccounts}
                        selectedIds={selectedIds}
                        onSelect={(id) => {
                            const next = new Set(selectedIds);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            setSelectedIds(next);
                        }}
                    />
                </TabsContent>

                <TabsContent value="kyc">
                    <KYCTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function AdminIdentityPage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Identity...</div>}>
            <AccountsContent />
        </Suspense>
    );
}
