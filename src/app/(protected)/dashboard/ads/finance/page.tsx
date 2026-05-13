"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import AdsInvoiceTable, { Invoice } from '@/components/ads/billing/AdsInvoiceTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import ProductTour from '@/components/dashboard/ProductTour';
import StatCard from '@/components/dashboard/StatCard';

export default function AdsBillingPage() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [walletBalance, setWalletBalance] = useState(0);
    const [adCredits, setAdCredits] = useState(0);
    const [rawTotalSpend, setRawTotalSpend] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const itemsPerPage = 10;

    const fetchBillingData = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_advertiser_billing_data', {
                p_account_id: activeAccount.id,
                p_limit: itemsPerPage,
                p_offset: (currentPage - 1) * itemsPerPage
            });

            if (error) throw error;

            const currency = 'USD';
            interface WalletItem {
                currency: string;
                cash_balance: number;
                credit_balance: number;
            }
            const primaryWallet = (data.wallets || []).find((w: WalletItem) => w.currency === currency) || data.wallets?.[0];
            
            interface TopUpItem {
                id: string;
                created_at: string;
                amount: number;
                currency: string;
                status: string;
            }
            const mapped: Invoice[] = (data.top_ups || []).map((tx: TopUpItem) => ({
                id: tx.id,
                date: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                amount: formatCurrency(Number(tx.amount), tx.currency || currency),
                status: tx.status === 'completed' ? 'paid' : tx.status === 'pending' ? 'pending' : 'overdue'
            }));

            setAllInvoices(mapped);
            setTotalCount(Number(data.top_up_count || 0));
            setRawTotalSpend(Number(data.total_spend || 0));
            setAdCredits(Number(data.total_credits || 0));
            setWalletBalance(Number(primaryWallet?.cash_balance ?? 0));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to sync billing data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast, currentPage, itemsPerPage]);

    useEffect(() => {
        if (!isOrgLoading) {
            if (activeAccount) {
                fetchBillingData();
            } else {
                setIsLoading(false);
            }
        }
    }, [isOrgLoading, activeAccount, fetchBillingData]);

    // Search is kept client-side since it filters over formatted date strings
    const invoices = searchQuery
        ? allInvoices.filter(inv =>
            inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.status.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : allInvoices;

    const totalPages = searchQuery
        ? Math.ceil(invoices.length / itemsPerPage)
        : Math.ceil(totalCount / itemsPerPage);
    const paginatedInvoices = searchQuery
        ? invoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
        : invoices;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const currency = 'USD';

    return (
        <div className={adminStyles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <PageHeader
                    title="Finance & Ad Spend"
                    subtitle="Track your ad spend, manage your wallet balance and view transaction history."
                />
                <Link href="/dashboard/ads/settings?tab=billing" className={adminStyles.btnPrimary} style={{ fontSize: '13px', padding: '10px 20px' }}>
                    Top Up Wallet
                </Link>
            </div>

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
                    label="Total Ad Spend"
                    value={formatCurrency(rawTotalSpend, currency)}
                    isLoading={isLoading}
                />
                <StatCard
                    label="Total Transactions"
                    value={totalCount}
                    isLoading={isLoading}
                    trend="neutral"
                />
            </div>

            <div style={{ marginTop: '32px' }} className="tour-billing-history">
                <h2 className={adminStyles.sectionTitle} style={{ marginBottom: '16px' }}>Ad Spend History</h2>
                <TableToolbar
                    onSearchChange={setSearchQuery}
                    searchValue={searchQuery}
                    searchPlaceholder="Search by status, date..."
                />
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
                         title: 'Billing & Payments',
                         content: 'Manage your organization\'s payment methods and track your advertising spend history.',
                         skipBeacon: true,
                     },
                     {
                         target: '.tour-billing-history',
                         title: 'Invoicing & Receipts',
                         content: 'Download historical invoices and track every transaction related to your ad campaigns.',
                     }
                 ]}
             />
        </div>
    );
}
