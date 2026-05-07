"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import PayoutTable from '@/components/features/finance/PayoutTable';
import WalletsTable from '@/components/features/finance/WalletsTable';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import Tabs from '@/components/dashboard/Tabs';
import { formatDate, formatCurrency } from '@/utils/format';
import Badge from '@/components/shared/Badge';
import type { BadgeVariant } from '@/types/shared';
import PageHeader from '@/components/dashboard/PageHeader';
import ProductTour from '@/components/dashboard/ProductTour';

function RevenueContent() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const VALID_TABS = ['wallets', 'payouts', 'refunds'] as const;
    type TabId = typeof VALID_TABS[number];
    const initialTab = (searchParams.get('tab') as string) || 'wallets';
    const [activeTab, setActiveTab] = useState<TabId>(
        (VALID_TABS as readonly string[]).includes(initialTab) ? initialTab as TabId : 'wallets'
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as string;
        if (tab && (VALID_TABS as readonly string[]).includes(tab)) {
            setActiveTab(tab as TabId);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as Extract<typeof activeTab, string>);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [payoutCurrentPage, setPayoutCurrentPage] = useState(1);
    const payoutItemsPerPage = 8;

    const [payouts, setPayouts] = useState<any[]>([]);
    const [wallets, setWallets] = useState<any[]>([]);
    const [refunds, setRefunds] = useState<any[]>([]);
    const [refundCurrentPage, setRefundCurrentPage] = useState(1);
    const refundItemsPerPage = 8;
    const [isLoading, setIsLoading] = useState(true);

    // Payout request modal state
    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutCurrency, setPayoutCurrency] = useState('KES');

    useEffect(() => {
        if (activeAccount?.wallet_currency) {
            setPayoutCurrency(activeAccount.wallet_currency);
        }
    }, [activeAccount?.wallet_currency]);

    // ── fetchFinancialData ────────────────────────────────────────────────
    const fetchFinancialData = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);

        try {
            // Payouts for this account
            const { data: payoutData, error: payoutError } = await supabase
                .schema('payouts')
                .from('payouts')
                .select('*')
                .eq('account_id', activeAccount.id)
                .order('created_at', { ascending: false });

            if (payoutError) throw payoutError;

            setPayouts((payoutData || []).map(p => ({
                id: p.id,
                recipient: activeAccount.name,
                amount: p.amount,
                status: p.status,
                requestedAt: formatDate(p.created_at),
                reference: p.payout_ref || `PO-${p.id.split('-')[0].toUpperCase()}`,
                processedAt: p.processed_at ? formatDate(p.processed_at) : undefined,
                notes: p.admin_notes
            })));

            // Wallets for this account
            const { data: walletData, error: walletError } = await supabase
                .from('account_wallets')
                .select('*')
                .eq('account_id', activeAccount.id)
                .order('currency');

            if (walletError) throw walletError;
            setWallets((walletData || []).map((w: any) => ({ ...w, id: w.reference || w.currency })));

            // Refund transactions for this account's events
            const { data: refundData, error: refundError } = await supabase
                .schema('transactions')
                .from('transactions')
                .select('id, amount, currency, status, created_at, updated_at, event_id, ticket_id, metadata')
                .eq('recipient_account_id', activeAccount.id)
                .eq('reason', 'ticket_refund')
                .eq('category', 'outgoing')
                .order('created_at', { ascending: false });

            if (refundError) throw refundError;

            // Fetch event titles for display
            const eventIds = [...new Set((refundData || []).map((r: any) => r.event_id).filter(Boolean))];
            let eventMap: Record<string, string> = {};
            if (eventIds.length > 0) {
                const { data: eventData } = await supabase
                    .from('events')
                    .select('id, title')
                    .in('id', eventIds);
                eventMap = (eventData || []).reduce((m: Record<string, string>, e: any) => { m[e.id] = e.title; return m; }, {});
            }

            setRefunds((refundData || []).map((r: any) => ({
                id: r.id,
                amount: r.amount,
                currency: r.currency,
                status: r.status,
                eventTitle: eventMap[r.event_id] || 'Unknown Event',
                eventId: r.event_id,
                ticketId: r.ticket_id,
                refundPercent: r.metadata?.refund_percent,
                reason: r.metadata?.msg || r.metadata?.cancel_reason || '-',
                date: formatDate(r.created_at),
            })));

        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to sync your financial records. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast]);

    // Update default payout currency when wallets load
    useEffect(() => {
        if (wallets.length > 0) {
            const hasCurrent = wallets.some(w => w.currency === payoutCurrency);
            if (!hasCurrent) {
                setPayoutCurrency(wallets[0].currency);
            }
        }
    }, [wallets, payoutCurrency]);

    // ── Effect ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOrgLoading && activeAccount) {
            fetchFinancialData();
        } else if (!isOrgLoading && !activeAccount) {
            setIsLoading(false);
            setPayouts([]);
            setWallets([]);
            setRefunds([]);
        }
    }, [isOrgLoading, activeAccount, fetchFinancialData]);

    // ── Request Payout ────────────────────────────────────────────────────
    const handleRequestPayout = async () => {
        if (!activeAccount) return;
        const parsed = parseFloat(payoutAmount);
        if (!payoutAmount || isNaN(parsed) || parsed <= 0) {
            showToast('Please enter a valid payout amount.', 'error');
            return;
        }

        showToast('Submitting payout request…', 'info');
        try {
            // First find the primary payout method
            const { data: methodData, error: methodError } = await supabase
                .schema('public')
                .from('account_payment_methods')
                .select('id')
                .eq('account_id', activeAccount.id)
                .limit(1)
                .single();

            if (methodError || !methodData) {
                showToast('Please set up a payment method before requesting a payout.', 'error');
                return;
            }

            const { error } = await supabase.rpc('request_account_payout', {
                p_account_id: activeAccount.id,
                p_amount: parsed,
                p_payout_method_id: methodData.id,
                p_currency: payoutCurrency
            });

            if (error) throw error;
            showToast('Payout request submitted. Our team will review it shortly.', 'success');
            setPayoutAmount('');
            fetchFinancialData(); // Refresh payout list
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to submit payout request.', 'error');
        }
    };

    // Selection Logic
    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        const paginatedPayouts = payouts.slice((payoutCurrentPage - 1) * payoutItemsPerPage, payoutCurrentPage * payoutItemsPerPage);
        if (selectedIds.size === paginatedPayouts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedPayouts.map(t => t.id)));
        }
    };

    return (
        <div className={styles.dashboardPage}>
            <PageHeader
                title="Revenue & Payouts"
                subtitle="Track your earnings and transaction history."
                actionClassName="tour-revenue-payout"
                actionLabel={!activeAccount?.payout_routing?.method ? "Connect Payout Method" : undefined}
                onActionClick={!activeAccount?.payout_routing?.method ? () => router.push('/dashboard/organize/settings?tab=payout') : undefined}
                customAction={activeAccount?.payout_routing?.method ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                            value={payoutCurrency}
                            onChange={(e) => setPayoutCurrency(e.target.value)}
                            className={styles.currencySelect}
                        >
                            {wallets.length > 0 ? (
                                wallets.map(w => (
                                    <option key={w.currency} value={w.currency}>{w.currency}</option>
                                ))
                            ) : (
                                <option value={activeAccount?.wallet_currency || 'KES'}>
                                    {activeAccount?.wallet_currency || 'KES'}
                                </option>
                            )}
                        </select>
                        <input
                            type="number"
                            min="1"
                            placeholder="Amount"
                            value={payoutAmount}
                            onChange={(e) => setPayoutAmount(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'inherit', width: '120px', fontSize: '14px' }}
                        />
                        <button className={styles.primaryBtn} onClick={handleRequestPayout}>
                            Request Payout
                        </button>
                    </div>
                ) : undefined}
            />

            {/* Tabs */}
            <div className="tour-revenue-tabs">
                <Tabs
                    options={[
                    { id: 'wallets', label: 'Wallets' },
                    { id: 'payouts', label: 'Payouts' },
                    { id: 'refunds', label: `Refunds${refunds.length > 0 ? ` (${refunds.length})` : ''}` }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />
            </div>

            <div className={styles.tableWrapper}>
                {activeTab === 'payouts' ? (
                    <PayoutTable
                        payouts={payouts.slice((payoutCurrentPage - 1) * payoutItemsPerPage, payoutCurrentPage * payoutItemsPerPage)}
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                        onSelectAll={handleSelectAll}
                        currentPage={payoutCurrentPage}
                        totalPages={Math.ceil(payouts.length / payoutItemsPerPage)}
                        onPageChange={setPayoutCurrentPage}
                        isLoading={isLoading}
                    />
                ) : activeTab === 'refunds' ? (
                    <RefundsTable
                        refunds={refunds}
                        currentPage={refundCurrentPage}
                        itemsPerPage={refundItemsPerPage}
                        onPageChange={setRefundCurrentPage}
                        isLoading={isLoading}
                    />
                ) : (
                    <WalletsTable
                        data={wallets}
                        isLoading={isLoading}
                    />
                )}
            </div>

            <ProductTour
                storageKey={activeAccount ? `hasSeenOrgRevenueJoyride_${activeAccount.id}` : 'hasSeenOrgRevenueJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Revenue & Payouts',
                        content: 'This is where you manage your earnings from ticket sales. You can view balances across multiple currencies and track your payout history.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-revenue-payout',
                        title: 'Request a Payout',
                        content: 'When you\'re ready to receive your funds, enter the amount here and click Request. Our team will process it to your connected bank or mobile wallet.',
                    },
                    {
                        target: '.tour-revenue-tabs',
                        title: 'Account Ledger',
                        content: 'Switch between "Wallets" to see current balances, "Payouts" to track requests and "Refunds" to view customer cancellations.',
                    },
                    {
                        target: 'a[href*="settings?tab=payout"]',
                        title: 'Connect Payout Method',
                        content: 'If you haven\'t already, make sure to connect a valid bank account or mobile money wallet in your settings to receive payments.',
                    }
                ]}
            />
        </div>
    );
}

// ── Refunds Table ─────────────────────────────────────────────────────────
const REFUND_STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
    completed: { label: 'Refunded', variant: 'success' },
    pending: { label: 'Pending', variant: 'warning' },
    failed: { label: 'Failed', variant: 'error' },
    cancelled: { label: 'Cancelled', variant: 'neutral' },
};

function RefundsTable({
    refunds,
    currentPage,
    itemsPerPage,
    onPageChange,
    isLoading,
}: {
    refunds: any[];
    currentPage: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    isLoading: boolean;
}) {
    const totalPages = Math.ceil(refunds.length / itemsPerPage);
    const paginated = refunds.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (isLoading) {
        return <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>Loading refunds...</div>;
    }

    if (refunds.length === 0) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
                <p style={{ fontSize: '15px', marginBottom: '4px' }}>No refunds yet</p>
                <p style={{ fontSize: '13px' }}>Refund transactions will appear here when ticket holders cancel their tickets.</p>
            </div>
        );
    }

    const totalRefunded = refunds
        .filter(r => r.status === 'completed')
        .reduce((sum: number, r: any) => sum + Number(r.amount), 0);

    return (
        <div>
            {/* Summary */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-interface-outline)', display: 'flex', gap: '24px', fontSize: '13px' }}>
                <span style={{ opacity: 0.6 }}>Total Refunded: <strong style={{ opacity: 1 }}>{formatCurrency(totalRefunded, refunds[0]?.currency || 'KES')}</strong></span>
                <span style={{ opacity: 0.6 }}>Count: <strong style={{ opacity: 1 }}>{refunds.length}</strong></span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-interface-outline)', textAlign: 'left' }}>
                        <th style={refTh}>Event</th>
                        <th style={refTh}>Amount</th>
                        <th style={refTh}>Status</th>
                        <th style={refTh}>Reason</th>
                        <th style={refTh}>Date</th>
                    </tr>
                </thead>
                <tbody>
                    {paginated.map((r: any) => {
                        const badge = REFUND_STATUS_MAP[r.status] || { label: r.status, variant: 'neutral' as BadgeVariant };
                        return (
                            <tr key={r.id} style={{ borderBottom: '1px solid var(--color-interface-outline)' }}>
                                <td style={refTd}>
                                    {r.eventId ? (
                                        <Link
                                            href={`/dashboard/organize/events/${r.eventId}`}
                                            style={{ color: 'var(--color-brand-primary)', textDecoration: 'none', fontWeight: 500 }}
                                        >
                                            {r.eventTitle}
                                        </Link>
                                    ) : (
                                        <span style={{ opacity: 0.5 }}>{r.eventTitle}</span>
                                    )}
                                </td>
                                <td style={refTd}>{formatCurrency(r.amount, r.currency)}</td>
                                <td style={refTd}><Badge label={badge.label} variant={badge.variant} /></td>
                                <td style={{ ...refTd, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>{r.reason}</td>
                                <td style={{ ...refTd, opacity: 0.6 }}>{r.date}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '16px' }}>
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        style={paginationBtn}
                    >
                        Previous
                    </button>
                    <span style={{ fontSize: '13px', opacity: 0.6 }}>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        style={paginationBtn}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}

const refTh: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    opacity: 0.5,
    fontWeight: 600,
};

const refTd: React.CSSProperties = {
    padding: '14px 16px',
};

const paginationBtn: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid var(--color-interface-outline)',
    background: 'transparent',
    color: 'var(--color-utility-primaryText)',
    fontSize: '13px',
    cursor: 'pointer',
};

export default function OrganizerRevenuePage() {
    return (
        <Suspense fallback={<div className={styles.loading}>Loading Revenue...</div>}>
            <RevenueContent />
        </Suspense>
    );
}
