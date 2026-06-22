"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import PayoutTable from '@/components/features/finance/PayoutTable';
import RefundTable, { type Refund } from '@/components/features/finance/RefundTable';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/shared/Tabs';
import { formatCurrency, formatString, formatDate } from '@/utils/format';
import { exportToCSV } from '@/utils/export';
import FilterChips from '@/components/shared/FilterChips';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import ProductTour from '@/components/dashboard/ProductTour';
import TableToolbar from '@/components/shared/TableToolbar';
import DateRangeRow from '@/components/shared/DateRangeRow';
import type { AccountWallet, Payout } from '@/types/organize';

type TabId = 'payouts' | 'refunds';

function RevenueContent() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const VALID_TABS: TabId[] = ['payouts', 'refunds'];
    const initialTab = (searchParams.get('tab') as TabId) || 'payouts';
    const [activeTab, setActiveTab] = useState<TabId>(
        VALID_TABS.includes(initialTab) ? initialTab : 'payouts'
    );

    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [wallets, setWallets] = useState<AccountWallet[]>([]);
    const [stats, setStats] = useState({
        grossRevenue: 0,
        availableBalance: 0,
        pendingEscrow: 0,
        totalRefunded: 0,
        totalPaidOut: 0,
    });

    const [isPayoutsLoading, setIsPayoutsLoading] = useState(true);
    const [payoutIds, setPayoutIds] = useState<Set<string>>(new Set());
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [totalPayouts, setTotalPayouts] = useState(0);
    const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>('all');
    const [refundIds, setRefundIds] = useState<Set<string>>(new Set());
    const [refunds, setRefunds] = useState<Refund[]>([]);
    const [totalRefunds, setTotalRefunds] = useState(0);
    const [refundStatusFilter, setRefundStatusFilter] = useState<string>('all');
    const [isRefundsLoading, setIsRefundsLoading] = useState(true);
    const itemsPerPage = 10;
    const [payoutsPage, setPayoutsPage] = useState(1);
    const [refundsPage, setRefundsPage] = useState(1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    /* ─ Mapping helpers (separated into two named functions) ─────────────────── */

    const buildPayoutRow = (r: Record<string, unknown>): Payout => ({
        recipient:      String(r.payout_id ?? 'Unknown Payout'),
        id:            String(r.payout_id),
        reference:     String(r.reference ?? r.reference ?? ''),
        eventName:     String(r.event_name ?? ''),
        payableWallet: String(r.wallet_reference ?? ''),
        wallet:        String(r.wallet_reference ?? ''),
        currency:      String(r.currency ?? r.wallet_currency ?? ''),
        amount:        Number(r.amount) || 0,
        status:        (String(r.status ?? '') as Payout['status']),
        processedAt:   typeof r.processed_at === 'string' ? r.processed_at : undefined,
        requestedAt:   String(r.requested_at ?? ''),
        createdAt:     String(r.requested_at ?? ''),
    });

    const buildRefundRow = (r: Record<string, unknown>): Refund => ({
        id:           String(r.refund_id ?? r.id ?? ''),
        reference:    String(r.reference ?? ''),
        event_name:   String(r.event_name ?? ''),
        ticket_code:  String(r.ticket_code ?? ''),
        amount:       Number(r.amount) || 0,
        currency:     String(r.currency ?? ''),
        status:       String(r.status ?? '') as Refund['status'],
        created_at:   String(r.created_at ?? ''),
        processed_at: typeof r.processed_at === 'string' ? r.processed_at : undefined,
    });

    /* ── Data fetch: summary ─────────────────────────────────────────────────── */
    const fetchSummary = useCallback(async () => {
        if (!activeAccount) return;
        try {
            const { data, error } = await supabase.schema('api').rpc('get_organizer_revenue_summary', {
                p_account_id: activeAccount.id,
            });
            if (error) throw error;
            setWallets(data?.wallets || []);
            setStats({
                grossRevenue:     Number(data?.total_revenue) || 0,
                availableBalance: Number(data?.net_revenue) || 0,
                pendingEscrow:    Number(data?.pending_escrow) || 0,
                totalRefunded:    Number(data?.total_refunded) || 0,
                totalPaidOut:     Number(data?.payouts) || 0,
            });
        } catch (err) {
            console.error('Failed to fetch revenue summary:', err);
        }
    }, [activeAccount, supabase]);

    /* ── Data fetch: payouts ─────────────────────────────────────────────────── */
    const fetchPayouts = useCallback(async () => {
        if (!activeAccount) return;
        setIsPayoutsLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('get_organizer_payouts', {
                p_account_id: activeAccount.id,
                p_status:     payoutStatusFilter === 'all' ? undefined : payoutStatusFilter,
                p_start_date: startDate ? new Date(startDate).toISOString() : undefined,
                p_end_date:   endDate ? new Date(endDate).toISOString() : undefined,
                p_limit:      itemsPerPage,
                p_offset:     (payoutsPage - 1) * itemsPerPage,
            });
            if (error) throw error;
            const raw = (data as { items?: Record<string, unknown>[]; total?: number } | null);
            const rows = (raw?.items ?? []).filter((row) => String(row.payout_id ?? row.id ?? '')).map(buildPayoutRow);
            setPayouts(rows);
            setTotalPayouts(raw?.total ?? rows.length);
        } catch (err) {
            showToast(getErrorMessage(err) || 'Failed to load payouts.', 'error');
        } finally {
            setIsPayoutsLoading(false);
        }
    }, [activeAccount, supabase, payoutsPage, payoutStatusFilter, startDate, endDate, showToast]);

    /* ── Data fetch: refunds ─────────────────────────────────────────────────── */
    const fetchRefunds = useCallback(async () => {
        if (!activeAccount) return;
        setIsRefundsLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('get_organizer_refund_requests', {
                p_account_id: activeAccount.id,
                p_status:     refundStatusFilter === 'all' ? undefined : refundStatusFilter,
                p_start_date: startDate ? new Date(startDate).toISOString() : undefined,
                p_end_date:   endDate ? new Date(endDate).toISOString() : undefined,
                p_limit:      itemsPerPage,
                p_offset:     (refundsPage - 1) * itemsPerPage,
            });
            if (error) throw error;
            const raw = (data as { items?: Record<string, unknown>[]; total?: number } | null);
            const rows = (raw?.items ?? []).filter((row) => String(row.refund_id ?? row.id ?? '')).map(buildRefundRow);
            setRefunds(rows);
            setTotalRefunds(raw?.total ?? rows.length);
        } catch (err) {
            showToast(getErrorMessage(err) || 'Failed to load refunds.', 'error');
        } finally {
            setIsRefundsLoading(false);
        }
    }, [activeAccount, supabase, refundsPage, refundStatusFilter, startDate, endDate, showToast]);

    /* ── Effects ─────────────────────────────────────────────────────────────── */
    useEffect(() => {
        if (!isOrgLoading && activeAccount) {
            fetchSummary();
            fetchPayouts();
            fetchRefunds();
        }
    }, [isOrgLoading, activeAccount, fetchSummary, fetchPayouts, fetchRefunds]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as TabId);
        setPayoutsPage(1);
        setRefundsPage(1);
        setPayoutIds(new Set());
        setRefundIds(new Set());
        setPayoutStatusFilter('all');
        setRefundStatusFilter('all');
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    /* ── Export ──────────────────────────────────────────────────────────────── */
    const handleExport = () => {
        const rows = activeTab === 'payouts' ? payouts : refunds;
        if (rows.length === 0) {
            showToast('No data to export.', 'warning');
            return;
        }
        showToast('Preparing report...', 'info');
        const csvRows = rows.map((r) => {
            if (activeTab === 'payouts') {
                const p = r as Payout;
                return {
                    reference:  p.reference,
                    event:      p.eventName,
                    wallet:     p.payableWallet || p.wallet || "",
                    currency:   p.currency || "",
                    amount:     p.amount,
                    status:     p.status,
                    settled_at: p.processedAt ? formatDate(p.processedAt) : formatDate(p.requestedAt),
                };
            }
            const ref = r as Refund;
            return {
                reference:    ref.reference,
                event:        ref.event_name,
                ticket_code:  ref.ticket_code,
                currency:     ref.currency,
                amount:       ref.amount,
                status:       ref.status,
                requested_at: formatDate(ref.created_at),
            };
        });
        exportToCSV(csvRows, `${activeTab}_report_${activeAccount?.name ?? 'org'}`);
        showToast('Report downloaded.', 'success');
    };

    return (
        <div className={styles.dashboardPage}>
            <PageHeader
                title="Revenue & Payouts"
                subtitle="Track payouts, refund requests and transaction history."
                actionLabel="Generate Report"
                onActionClick={handleExport}
                actionIcon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                }
            />

            {/* Stat Cards */}
            <div className={styles.statsGrid}>
                <StatCard
                    label="Gross Revenue"
                    value={formatCurrency(stats.grossRevenue)}
                    trend="positive"
                    isLoading={isSummaryLoading}
                />
                <StatCard
                    label="Available Balance"
                    value={formatCurrency(stats.availableBalance)}
                    change="Spendable"
                    isLoading={isSummaryLoading}
                />
                <StatCard
                    label="Pending Escrow"
                    value={formatCurrency(stats.pendingEscrow)}
                    change="Locked"
                    isLoading={isSummaryLoading}
                />
                <StatCard
                    label="Total Paid Out"
                    value={formatCurrency(stats.totalPaidOut)}
                    isLoading={isSummaryLoading}
                />
            </div>

            <TableToolbar
                searchValue=""
                onSearchChange={() => {}}
                searchPlaceholder={`Search ${activeTab}...`}
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

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className="tour-revenue-tabs" style={{ marginTop: 'var(--spacing-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                    <TabsList>
                        <TabsTrigger value="payouts">Payouts</TabsTrigger>
                        <TabsTrigger value="refunds">Refunds</TabsTrigger>
                    </TabsList>
                    {activeTab === 'payouts' ? (
                        <FilterChips
                            options={[
                                { value: 'all', label: 'All' },
                                { value: 'requested', label: 'Requested' },
                                { value: 'processing', label: 'Processing' },
                                { value: 'completed', label: 'Completed' },
                                { value: 'failed', label: 'Failed' },
                                { value: 'rejected', label: 'Rejected' },
                            ]}
                            currentValue={payoutStatusFilter}
                            onChange={setPayoutStatusFilter}
                        />
                    ) : (
                        <FilterChips
                            options={[
                                { value: 'all', label: 'All' },
                                { value: 'pending', label: 'Pending' },
                                { value: 'approved', label: 'Approved' },
                                { value: 'rejected', label: 'Rejected' },
                                { value: 'processed', label: 'Processed' },
                            ]}
                            currentValue={refundStatusFilter}
                            onChange={setRefundStatusFilter}
                        />
                    )}
                </div>
            </Tabs>

            <div className={styles.tableWrapper}>
                {activeTab === 'payouts' ? (
                    <PayoutTable
                        payouts={payouts}
                        selectedIds={payoutIds}
                        onSelect={(id) =>
                            setPayoutIds((prev) => {
                                const next = new Set(prev);
                                next.has(id) ? next.delete(id) : next.add(id);
                                return next;
                            })
                        }
                        onSelectAll={() =>
                            setPayoutIds((prev) =>
                                prev.size === payouts.length ? new Set() : new Set(payouts.map((p) => p.id))
                            )
                        }
                        currentPage={payoutsPage}
                        totalPages={Math.ceil(totalPayouts / itemsPerPage)}
                        onPageChange={setPayoutsPage}
                        isLoading={isPayoutsLoading}
                    />
                ) : (
                    <RefundTable
                        refunds={refunds}
                        selectedIds={refundIds}
                        onSelect={(id) =>
                            setRefundIds((prev) => {
                                const next = new Set(prev);
                                next.has(id) ? next.delete(id) : next.add(id);
                                return next;
                            })
                        }
                        onSelectAll={() =>
                            setRefundIds((prev) =>
                                prev.size === refunds.length ? new Set() : new Set(refunds.map((p) => p.id))
                            )
                        }
                        currentPage={refundsPage}
                        totalPages={Math.ceil(totalRefunds / itemsPerPage)}
                        onPageChange={setRefundsPage}
                        isLoading={isRefundsLoading}
                    />
                )}
            </div>

            <ProductTour
                storageKey={activeAccount ? `hasSeenOrgRevenueJoyride_${activeAccount.id}` : 'hasSeenOrgRevenueJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Financial Dashboard',
                        content: "Track every cent earned from your events. View gross revenue, pending escrow, and successful payouts.",
                        skipBeacon: true,
                    },
                    {
                        target: '.stats-grid',
                        title: 'Real-time Balances',
                        content: 'Monitor your available balance and funds currently held in escrow until your events are successfully completed.',
                    },
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
