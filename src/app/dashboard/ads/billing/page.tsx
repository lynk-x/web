"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import styles from '../../page.module.css';
import Link from 'next/link';
import AdsInvoiceTable, { Invoice } from '@/components/ads/billing/AdsInvoiceTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency } from '@/utils/format';

export default function AdsBillingPage() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [rawTotalSpend, setRawTotalSpend] = useState(0);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const itemsPerPage = 10;

    const fetchBillingData = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            // Scope ad-spend transactions via this account's campaign IDs.
            // transactions has no account_id column — must be scoped indirectly.
            const { data: campaigns } = await supabase
                .from('ad_campaigns')
                .select('id')
                .eq('account_id', activeAccount.id);

            const campaignIds = (campaigns || []).map((c: any) => c.id);

            const [transRes, walletRes, methodsRes] = await Promise.all([
                campaignIds.length > 0
                    ? supabase
                        .from('transactions')
                        .select('id, amount, status, created_at, currency, reason')
                        .in('campaign_id', campaignIds)
                        .eq('reason', 'ad_campaign_payment')
                        .order('created_at', { ascending: false })
                    // If no campaigns yet, return an empty result
                    : Promise.resolve({ data: [], error: null }),

                // Wallet balance for the account's default currency
                supabase
                    .from('account_wallets')
                    .select('balance')
                    .eq('account_id', activeAccount.id)
                    .eq('currency', activeAccount.default_currency || 'KES')
                    .maybeSingle(),

                // Saved payment methods
                supabase
                    .from('account_payment_methods')
                    .select('*')
                    .eq('account_id', activeAccount.id)
            ]);

            const currency = activeAccount.default_currency || 'KES';

            // Map transactions to the Invoice display type;
            // also accumulate raw spend so we can display the total accurately.
            let spend = 0;
            const mapped: Invoice[] = (transRes.data || []).map((tx: any) => {
                spend += Number(tx.amount || 0);
                return {
                    id: tx.id,
                    date: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    amount: formatCurrency(Number(tx.amount), tx.currency || currency),
                    status: tx.status === 'completed' ? 'paid' : tx.status === 'pending' ? 'pending' : 'overdue'
                };
            });

            setInvoices(mapped);
            setRawTotalSpend(spend);
            setWalletBalance(Number(walletRes.data?.balance ?? 0));
            setPaymentMethods(methodsRes.data || []);
        } catch (err: any) {
            showToast(err.message || 'Failed to load billing data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast]);

    useEffect(() => {
        if (!isOrgLoading) {
            fetchBillingData();
        }
    }, [isOrgLoading, fetchBillingData]);

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
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Billing &amp; Payments</h1>
                    <p className={styles.subtitle}>Manage your payment methods and view ad spend invoices.</p>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {/* Payment Methods */}
                <section className={styles.section} style={{ padding: '24px', backgroundColor: 'var(--color-interface-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-interface-outline)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Payment Methods</h2>
                        <Link href="/dashboard/ads/billing/payment-methods" className={styles.createBtn} style={{ fontSize: '12px', padding: '6px 12px', textDecoration: 'none' }}>+ Add Method</Link>
                    </div>

                    {isLoading ? (
                        <div style={{ padding: '24px', textAlign: 'center', opacity: 0.5, fontSize: '14px' }}>Loading...</div>
                    ) : paymentMethods.length > 0 ? (
                        paymentMethods.map((method: any) => (
                            <div key={method.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid var(--color-interface-outline)', borderRadius: '8px', marginBottom: '8px' }}>
                                <div style={{ width: '40px', height: '25px', backgroundColor: '#e0e0e0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#666', fontWeight: 'bold' }}>
                                    {method.type?.toUpperCase() || 'CARD'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500 }}>{method.label || 'Payment Method'}</div>
                                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{method.is_default ? 'Default' : ''}</div>
                                </div>
                                <Link
                                    href="/dashboard/ads/billing/payment-methods"
                                    style={{ background: 'transparent', border: 'none', color: 'var(--color-utility-primaryText)', opacity: 0.5, cursor: 'pointer', fontSize: '14px', textDecoration: 'none' }}
                                >
                                    Edit
                                </Link>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--color-interface-outline)', borderRadius: '8px', opacity: 0.6 }}>
                            <p style={{ fontSize: '14px', margin: 0 }}>No payment methods added.</p>
                        </div>
                    )}
                </section>

                {/* Wallet Balance */}
                <section className={styles.section} style={{ padding: '24px', backgroundColor: 'var(--color-interface-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-interface-outline)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 8px 0', opacity: 0.7 }}>Available Balance</h2>
                            <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
                                {isLoading ? '...' : formatCurrency(walletBalance, currency)}
                            </div>
                            <p style={{ fontSize: '12px', opacity: 0.6, margin: 0 }}>
                                Available funds for advertising.
                            </p>
                        </div>
                        <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 8px 0', opacity: 0.7 }}>Total Ad Spend</h3>
                            <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                                {isLoading ? '...' : formatCurrency(rawTotalSpend, currency)}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.6 }}>
                                {invoices.length} transaction{invoices.length !== 1 ? 's' : ''} total
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Invoice History */}
            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Ad Spend History</h2>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <TableToolbar
                        onSearchChange={setSearchQuery}
                        searchValue={searchQuery}
                        searchPlaceholder="Search by status, date..."
                    />
                </div>

                <AdsInvoiceTable
                    invoices={paginatedInvoices}
                    currentPage={currentPage}
                    totalPages={totalPages || 1}
                    onPageChange={setCurrentPage}
                />
            </section>
        </div>
    );
}
