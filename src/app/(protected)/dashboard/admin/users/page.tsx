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
import CreateAccountDrawer from '@/components/admin/users/CreateAccountDrawer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import StatusFilterChips from '@/components/shared/StatusFilterChips';
import DateRangeRow from '@/components/shared/DateRangeRow';
import type { AdminAccount } from '@/types/admin';

function AccountsContent() {
    const searchParams = useSearchParams();
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
    const [activeTab, setActiveTab] = useState('accounts');
    const [kycStatusFilter, setKycStatusFilter] = useState('pending');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    interface AdminSummary {
        users?: {
            total: number;
            kyc_pending: number;
            growth_30d: number;
            churn_30d: number;
        };
    }
    const [summary, setSummary] = useState<AdminSummary | null>(null);
    const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

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
        } catch (err: unknown) {
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
    }, [debouncedSearch, typeFilter, statusFilter, startDate, endDate]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    return (
        <div className={sharedStyles.container}>
            <PageHeader 
                title="Identity & Compliance" 
                subtitle="Manage organizational accounts, KYC status and system access." 
                actionLabel="Create Account"
                onActionClick={() => setIsCreateDrawerOpen(true)}
                actionIcon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '8px' }}>
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                }
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

            <TableToolbar 
                searchPlaceholder="Search accounts, names or emails..." 
                searchValue={searchTerm} 
                onSearchChange={setSearchTerm}
            >
                <DateRangeRow 
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onClear={() => {
                        setStartDate('');
                        setEndDate('');
                    }}
                />
            </TableToolbar>

            <Tabs value={activeTab} onValueChange={setActiveTab} className={styles.tabs}>
                <div className={adminStyles.tabsHeaderRow}>
                    <TabsList>
                        <TabsTrigger value="accounts">Accounts & Users</TabsTrigger>
                        <TabsTrigger value="kyc">KYC Workspace</TabsTrigger>
                    </TabsList>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activeTab === 'accounts' ? (
                            <>
                                <select 
                                    className={adminStyles.filterSelect}
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    style={{ height: '36px', padding: '0 12px' }}
                                >
                                    <option value="all">All Types</option>
                                    <option value="organizer">Organizers</option>
                                    <option value="advertiser">Advertisers</option>
                                    <option value="attendee">Attendees</option>
                                    <option value="pulse_user">Pulse Users</option>
                                    <option value="platform">Platform</option>
                                </select>
                                <StatusFilterChips 
                                    options={[
                                        { value: 'all', label: 'All Statuses' },
                                        { value: 'active', label: 'Active' },
                                        { value: 'suspended', label: 'Suspended' },
                                        { value: 'frozen', label: 'Frozen' },
                                    ]}
                                    currentValue={statusFilter}
                                    onChange={setStatusFilter}
                                />
                            </>
                        ) : (
                            <StatusFilterChips 
                                options={[
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'under_review', label: 'Under Review' },
                                    { value: 'approved', label: 'Approved' },
                                    { value: 'rejected', label: 'Rejected' },
                                ]}
                                currentValue={kycStatusFilter}
                                onChange={setKycStatusFilter}
                            />
                        )}
                    </div>
                </div>

                <TabsContent value="accounts">
                    <div className={adminStyles.container}>

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
                    </div>
                </TabsContent>

                <TabsContent value="kyc">
                    <KYCTab searchTerm={searchTerm} onSearchChange={setSearchTerm} statusFilter={kycStatusFilter} />
                </TabsContent>
            </Tabs>

            <CreateAccountDrawer 
                isOpen={isCreateDrawerOpen}
                onClose={() => setIsCreateDrawerOpen(false)}
                onSuccess={() => {
                    fetchAccounts();
                    fetchSummary();
                }}
            />
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
