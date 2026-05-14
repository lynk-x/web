"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import FinanceTable from '@/components/features/finance/FinanceTable';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/shared/Tabs';
import { formatCurrency } from '@/utils/format';
import { exportToCSV } from '@/utils/export';
import PageHeader from '@/components/dashboard/PageHeader';
import ProductTour from '@/components/dashboard/ProductTour';
import TableToolbar from '@/components/shared/TableToolbar';
import StatCard from '@/components/dashboard/StatCard';
import type { FinanceTransaction, AccountWallet } from '@/types/organize';

function RevenueContent() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const VALID_TABS = ['all', 'incoming', 'outgoing', 'hold'] as const;
    type TabId = typeof VALID_TABS[number];
    
    const initialTab = (searchParams.get('tab') as string) || 'all';
    const [activeTab, setActiveTab] = useState<TabId>(
        (VALID_TABS as readonly string[]).includes(initialTab) ? initialTab as TabId : 'all'
    );
    
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
    const [totalTransactions, setTotalTransactions] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [wallets, setWallets] = useState<AccountWallet[]>([]);
    const [stats, setStats] = useState({
        grossRevenue: 0,
        availableBalance: 0,
        pendingEscrow: 0,
        totalRefunded: 0,
        totalPaidOut: 0
    });

    const fetchSummary = useCallback(async () => {
        if (!activeAccount) return;
        try {
            const { data, error } = await supabase.rpc('get_organizer_revenue_summary', {
                p_account_id: activeAccount.id
            });
            if (error) throw error;
            setWallets(data.wallets || []);
            setStats(data.stats);
        } catch (err) {
            console.error('Failed to fetch revenue summary:', err);
        }
    }, [activeAccount, supabase]);

    const fetchTransactions = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_organizer_transactions', {
                p_account_id: activeAccount.id,
                p_category: activeTab === 'all' ? null : activeTab,
                p_limit: itemsPerPage,
                p_offset: (currentPage - 1) * itemsPerPage
            });

            if (error) throw error;

            interface TransactionRow {
                id: string;
                reason: string;
                ticket_code: string | null;
                amount: number;
                created_at: string;
                status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
                category: 'incoming' | 'outgoing' | 'internal' | 'hold';
                event_title: string | null;
            }

            setTransactions((data.transactions || []).map((t: TransactionRow) => ({
                id: t.id,
                description: t.reason === 'ticket_sale' ? `Ticket Sale: ${t.ticket_code || '—'}` : null,
                amount: t.amount,
                date: t.created_at,
                status: t.status,
                type: t.reason as FinanceTransaction['type'],
                category: t.category,
                reference: t.id.split('-')[0].toUpperCase(),
                event: t.event_title,
                createdAt: t.created_at
            })));
            setTotalTransactions(data.total || 0);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to sync your financial records.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, activeTab, currentPage, supabase, showToast]);

    useEffect(() => {
        if (!isOrgLoading && activeAccount) {
            fetchSummary();
            fetchTransactions();
        }
    }, [isOrgLoading, activeAccount, fetchSummary, fetchTransactions]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as TabId);
        setCurrentPage(1);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleExport = () => {
        if (transactions.length === 0) {
            showToast(`No data to export.`, 'warning');
            return;
        }
        showToast(`Preparing report...`, 'info');
        exportToCSV(
            transactions.map(t => ({
                date: t.date,
                event: t.event || '—',
                type: t.type,
                amount: t.amount,
                currency: 'KES',
                status: t.status
            })),
            `revenue_report_${activeAccount?.name || 'org'}`
        );
        showToast('Report downloaded.', 'success');
    };

    return (
        <div className={styles.dashboardPage}>
            <PageHeader
                title="Revenue & Payouts"
                subtitle="Track your earnings and transaction history."
                actionLabel="Generate Report"
                onActionClick={handleExport}
                actionIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>}
            />

            {/* Stat Cards */}
            <div className={styles.statsGrid}>
                <StatCard 
                    label="Gross Revenue" 
                    value={formatCurrency(stats.grossRevenue)} 
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard 
                    label="Available Balance" 
                    value={formatCurrency(stats.availableBalance)} 
                    change="Spendable"
                    isLoading={isLoading}
                />
                <StatCard 
                    label="Pending Escrow" 
                    value={formatCurrency(stats.pendingEscrow)} 
                    change="Locked"
                    isLoading={isLoading}
                />
                <StatCard 
                    label="Total Paid Out" 
                    value={formatCurrency(stats.totalPaidOut)} 
                    isLoading={isLoading}
                />
            </div>

            <TableToolbar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder={`Search transactions...`}
            />

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className="tour-revenue-tabs" style={{ marginTop: 'var(--spacing-md)' }}>
                    <TabsList>
                        <TabsTrigger value="all">All Activity</TabsTrigger>
                        <TabsTrigger value="incoming">Earnings</TabsTrigger>
                        <TabsTrigger value="outgoing">Withdrawals/Refunds</TabsTrigger>
                        <TabsTrigger value="hold">Locked Escrow</TabsTrigger>
                    </TabsList>
                </div>
            </Tabs>

            <div className={styles.tableWrapper}>
                <FinanceTable
                    transactions={transactions}
                    currentPage={currentPage}
                    totalPages={Math.ceil(totalTransactions / itemsPerPage)}
                    onPageChange={setCurrentPage}
                />
            </div>

            <ProductTour
                storageKey={activeAccount ? `hasSeenOrgRevenueJoyride_${activeAccount.id}` : 'hasSeenOrgRevenueJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Financial Dashboard',
                        content: 'Track every cent earned from your events. View gross revenue, pending escrow, and successful payouts.',
                        skipBeacon: true,
                    },
                    {
                        target: '.stats-grid',
                        title: 'Real-time Balances',
                        content: 'Monitor your available balance and funds currently held in escrow until your events are successfully completed.',
                    }
                ]}
            />
        </div>
    );
}

export default function OrganizerRevenuePage() {
    return (
        <Suspense fallback={<div className={styles.loading}>Loading Revenue...</div>}>
            <RevenueContent />
        </Suspense>
    );
}
