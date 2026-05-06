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

export default function AdsBillingPage() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [walletBalance, setWalletBalance] = useState(0);
    const [rawTotalSpend, setRawTotalSpend] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const itemsPerPage = 10;

    const fetchBillingData = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            const [topupsRes, walletRes, campaignsRes] = await Promise.all([
                supabase
                    .from('wallet_top_ups')
                    .select('id, amount, status, created_at, currency', { count: 'exact' })
                    .eq('account_id', activeAccount.id)
                    .order('created_at', { ascending: false })
                    .range(from, to),
                supabase
                    .from('account_wallets')
                    .select('balance')
                    .eq('account_id', activeAccount.id)
                    .eq('currency', 'USD')
                    .maybeSingle(),
                supabase
                    .from('ad_campaigns')
                    .select('spent_amount')
                    .eq('account_id', activeAccount.id)
            ]);

            const currency = 'USD';
            const totalSpend = (campaignsRes.data || []).reduce((acc: number, c: any) => acc + Number(c.spent_amount || 0), 0);

            const mapped: Invoice[] = (topupsRes.data || []).map((tx: any) => ({
                id: tx.id,
                date: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                amount: formatCurrency(Number(tx.amount), tx.currency || currency),
                status: tx.status === 'completed' ? 'paid' : tx.status === 'pending' ? 'pending' : 'overdue'
            }));

            setAllInvoices(mapped);
            setTotalCount(topupsRes.count ?? 0);
            setRawTotalSpend(totalSpend);
            setWalletBalance(Number(walletRes.data?.balance ?? 0));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load billing data.', 'error');
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
            <PageHeader
                title="Finance & Ad Spend"
                subtitle="Track your ad spend, manage your wallet balance and view transaction history."
            />

            <div className={adminStyles.subPageGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                <div className={`${adminStyles.pageCard} tour-billing-balance`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 className={adminStyles.sectionTitle} style={{ fontSize: '14px', marginBottom: '8px' }}>Available Balance</h2>
                            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-brand-primary)' }}>
                                {isLoading ? '...' : formatCurrency(walletBalance, currency)}
                            </div>
                            <p style={{ fontSize: '12px', opacity: 0.5, marginTop: '8px' }}>Funds available for active campaigns</p>
                        </div>
                        <Link href="/dashboard/ads/settings?tab=billing" className={adminStyles.btnPrimary} style={{ fontSize: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {!activeAccount?.payout_routing?.method && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#000' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            )}
                            Top Up Wallet
                        </Link>
                    </div>
                </div>

                <div className={adminStyles.pageCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 className={adminStyles.sectionTitle} style={{ fontSize: '14px', marginBottom: '8px' }}>Total Spend</h2>
                            <div style={{ fontSize: '32px', fontWeight: 700 }}>
                                {isLoading ? '...' : formatCurrency(rawTotalSpend, currency)}
                            </div>
                        </div>
                        <Link href="/dashboard/ads/settings?tab=billing" className={adminStyles.btnSecondary} style={{ fontSize: '12px', padding: '8px 16px', opacity: 0.8 }}>
                            Manage Methods
                        </Link>
                    </div>
                </div>
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
                        target: '.tour-ads-billing-methods',
                        title: 'Funding Your Campaigns',
                        content: 'Securely add or update your credit cards and mobile money accounts to ensure uninterrupted ad delivery.',
                    },
                    {
                        target: '.tour-ads-billing-history',
                        title: 'Invoicing & Receipts',
                        content: 'Download historical invoices and track every transaction related to your ad campaigns.',
                    }
                ]}
            />
        </div>
    );
}
