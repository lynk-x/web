"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import AdsInvoiceTable, { Invoice } from '@/components/ads/billing/AdsInvoiceTable';
import TableToolbar from '@/components/shared/TableToolbar';
import DateRangeRow from '@/components/shared/DateRangeRow';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import ProductTour from '@/components/dashboard/ProductTour';
import StatCard from '@/components/dashboard/StatCard';
import { useResponsivePageSize } from '@/hooks/useResponsivePageSize';
import { usePagination } from '@/hooks/usePagination';

export default function AdsBillingPage() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [adCredits, setAdCredits] = useState(0);
    const [rawTotalSpend, setRawTotalSpend] = useState(0);
    const [currency, setCurrency] = useState('USD');
    const [invoicesAvailable, setInvoicesAvailable] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const itemsPerPage = useResponsivePageSize({ chromeHeight: 560 });
    const { currentPage, setCurrentPage, totalCount, setTotalCount } = usePagination(itemsPerPage, [searchQuery, startDate, endDate]);

    const fetchBillingData = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('get_advertiser_billing_data', {
                p_account_id: activeAccount.id,
                p_limit: itemsPerPage,
                p_offset: (currentPage - 1) * itemsPerPage
            });

            if (error) throw error;

            interface WalletItem {
                currency: string;
                cash_balance: number;
                credit_balance: number;
            }
            // The account's first (or only, in the common case) wallet —
            // was previously always assumed to be USD, so a non-USD advertiser
            // silently got a wallets?.[0] fallback still mislabeled "USD".
            const primaryWallet: WalletItem | undefined = data.wallets?.[0];
            const primaryCurrency = primaryWallet?.currency || 'USD';

            interface TransactionItem {
                id: string;
                reference: string;
                created_at: string;
                amount: number;
                currency: string;
                status: string;
                reason: string;
                metadata?: any;
            }
            const mapped: Invoice[] = (data.transactions || []).map((tx: TransactionItem) => ({
                id: tx.id,
                reference: tx.reference,
                date: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                createdAtRaw: tx.created_at,
                amount: formatCurrency(Number(tx.amount), tx.currency || primaryCurrency),
                status: tx.status === 'completed' ? 'paid' : tx.status === 'pending' ? 'pending' : 'overdue',
                reason: tx.reason,
                campaign_title: tx.metadata?.campaign_title || (tx.reason === 'wallet_top_up' ? 'Wallet Deposit' : 'Ad Campaign Payment'),
                currency: tx.currency
            }));

            setAllInvoices(mapped);
            setTotalCount(Number(data.transaction_count || 0));
            setRawTotalSpend(Number(data.total_spend || 0));
            setAdCredits(Number(data.total_credits || 0));
            setWalletBalance(Number(primaryWallet?.cash_balance ?? 0));
            setCurrency(primaryCurrency);
            setInvoicesAvailable(Number(data.completed_transaction_count || 0));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to sync billing data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast, currentPage, itemsPerPage, setTotalCount]);

    useEffect(() => {
        if (!isOrgLoading) {
            if (activeAccount) {
                fetchBillingData();
            } else {
                setIsLoading(false);
            }
        }
    }, [isOrgLoading, activeAccount, fetchBillingData]);

    // Search and date-range filtering are both kept client-side, over the
    // currently-loaded page of transactions — get_advertiser_billing_data
    // has no server-side date-range params, unlike the organizer revenue
    // page's payout/refund RPCs.
    const isFiltering = Boolean(searchQuery || startDate || endDate);
    const invoices = isFiltering
        ? allInvoices.filter(inv => {
            const matchesSearch = !searchQuery ||
                inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (inv.reference && inv.reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
                inv.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
                inv.status.toLowerCase().includes(searchQuery.toLowerCase());

            const invDate = inv.createdAtRaw ? inv.createdAtRaw.slice(0, 10) : null;
            const matchesStart = !startDate || (invDate !== null && invDate >= startDate);
            const matchesEnd = !endDate || (invDate !== null && invDate <= endDate);

            return matchesSearch && matchesStart && matchesEnd;
          })
        : allInvoices;

    const totalPages = isFiltering
        ? Math.ceil(invoices.length / itemsPerPage)
        : Math.ceil(totalCount / itemsPerPage);
    const paginatedInvoices = isFiltering
        ? invoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
        : invoices;

    const handleExport = () => {
        window.print();
    };

    return (
        <div className={adminStyles.container}>
            <PageHeader
                title="Finance & Ad Spend"
                subtitle="Track your ad spend, manage your wallet balance and view transaction history."
                actionLabel="Generate Report"
                onActionClick={handleExport}
                actionIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>}
            />

            <div className={adminStyles.statsGrid}>
                <StatCard
                    label="Available Balance"
                    value={formatCurrency(walletBalance, currency)}
                    isLoading={isLoading}
                    color="var(--color-brand-primary)"
                />
                <StatCard
                    label="Ad Credits"
                    value={formatCurrency(adCredits, currency)}
                    isLoading={isLoading}
                    color="var(--color-success)"
                />
                <StatCard
                    label="Ad Spend"
                    value={formatCurrency(rawTotalSpend, currency)}
                    isLoading={isLoading}
                />
                <StatCard
                    label="Invoices Available"
                    value={invoicesAvailable}
                    change="All time"
                    isLoading={isLoading}
                />
            </div>

            <div style={{ marginTop: '32px' }} className="tour-billing-history">
                <TableToolbar
                    onSearchChange={setSearchQuery}
                    searchValue={searchQuery}
                    searchPlaceholder="Search by status, reference..."
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
                <div style={{ marginTop: '16px' }}>
                    <AdsInvoiceTable
                        invoices={paginatedInvoices}
                        currentPage={currentPage}
                        totalPages={totalPages || 1}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>

            <ProductTour
                storageKey={activeAccount ? `hasSeenAdsBillingJoyride_${activeAccount.id}` : 'hasSeenAdsBillingJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Ad Spend & Finance',
                        content: 'Track all charges and payments related to your advertising campaigns. Download invoices, monitor your spend history and ensure your wallet has sufficient funds to keep campaigns running.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-billing-history',
                        title: 'Invoice & Transaction History',
                        content: 'Every charge for ad impressions and clicks is logged here. Search by status or date, then download a CSV export for accounting or reconciliation purposes.',
                    },
                ]}
            />
        </div>
    );
}
