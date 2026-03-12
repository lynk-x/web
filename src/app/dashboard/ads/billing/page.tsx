"use client";

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

export default function AdsBillingPage() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [rawTotalSpend, setRawTotalSpend] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const itemsPerPage = 10;

    const fetchBillingData = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const [topupsRes, walletRes, campaignsRes] = await Promise.all([
                supabase
                    .from('wallet_top_ups')
                    .select('id, amount, status, created_at, currency')
                    .eq('account_id', activeAccount.id)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('account_wallets')
                    .select('balance')
                    .eq('account_id', activeAccount.id)
                    .eq('currency', activeAccount.default_currency || 'KES')
                    .maybeSingle(),
                supabase
                    .from('ad_campaigns')
                    .select('spent_amount')
                    .eq('account_id', activeAccount.id)
            ]);

            const currency = activeAccount.default_currency || 'KES';
            let totalSpend = (campaignsRes.data || []).reduce((acc: number, c: any) => acc + Number(c.spent_amount || 0), 0);

            const mapped: Invoice[] = (topupsRes.data || []).map((tx: any) => {
                return {
                    id: tx.id,
                    date: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    amount: formatCurrency(Number(tx.amount), tx.currency || currency),
                    status: tx.status === 'completed' ? 'paid' : tx.status === 'pending' ? 'pending' : 'overdue'
                };
            });

            setInvoices(mapped);
            setRawTotalSpend(totalSpend);
            setWalletBalance(Number(walletRes.data?.balance ?? 0));
        } catch (err: any) {
            showToast(err.message || 'Failed to load billing data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast]);

    useEffect(() => {
        if (!isOrgLoading) {
            if (activeAccount) {
                fetchBillingData();
            } else {
                setIsLoading(false);
            }
        }
    }, [isOrgLoading, activeAccount, fetchBillingData]);

    const filteredInvoices = invoices.filter(inv =>
        inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const paginatedInvoices = filteredInvoices.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const currency = activeAccount?.default_currency || 'KES';

    return (
        <div className={adminStyles.container}>
            <PageHeader
                title="Finance & Ad Spend"
                subtitle="Track your ad spend, manage your wallet balance, and view transaction history."
            />

            <div className={adminStyles.subPageGrid} style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                <div className={adminStyles.pageCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 className={adminStyles.sectionTitle} style={{ fontSize: '14px', marginBottom: '8px' }}>Available Balance</h2>
                            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-brand-primary)' }}>
                                {isLoading ? '...' : formatCurrency(walletBalance, currency)}
                            </div>
                            <p style={{ fontSize: '12px', opacity: 0.5, marginTop: '8px' }}>Funds available for active campaigns</p>
                        </div>
                        <Link href="/dashboard/ads/settings?tab=billing" className={adminStyles.btnPrimary} style={{ fontSize: '12px', padding: '8px 16px' }}>
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
                            <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(32, 249, 40, 0.05)', border: '1px solid rgba(32, 249, 40, 0.1)', display: 'inline-block' }}>
                                <p style={{ fontSize: '11px', margin: 0, opacity: 0.8 }}>
                                    Estimated impressions: <strong>{isLoading ? '...' : (rawTotalSpend * 10).toLocaleString()}</strong>
                                </p>
                            </div>
                        </div>
                        <Link href="/dashboard/ads/settings?tab=billing" className={adminStyles.btnSecondary} style={{ fontSize: '12px', padding: '8px 16px', opacity: 0.8 }}>
                            Manage Methods
                        </Link>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '32px' }}>
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
        </div>
    );
}
