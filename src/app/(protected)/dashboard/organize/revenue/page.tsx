"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import PayoutTable from '@/components/features/finance/PayoutTable';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import Tabs from '@/components/dashboard/Tabs';
import { formatDate, formatCurrency } from '@/utils/format';
import { exportToCSV } from '@/utils/export';
import Badge from '@/components/shared/Badge';
import type { BadgeVariant } from '@/types/shared';
import PageHeader from '@/components/dashboard/PageHeader';
import ProductTour from '@/components/dashboard/ProductTour';
import TableToolbar from '@/components/shared/TableToolbar';

function RevenueContent() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const VALID_TABS = ['payouts', 'refunds'] as const;
    type TabId = typeof VALID_TABS[number];
    const initialTab = (searchParams.get('tab') as string) || 'payouts';
    const [activeTab, setActiveTab] = useState<TabId>(
        (VALID_TABS as readonly string[]).includes(initialTab) ? initialTab as TabId : 'payouts'
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

    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [timeRange, setTimeRange] = useState('all');
    const [payouts, setPayouts] = useState<any[]>([]);
    const [wallets, setWallets] = useState<any[]>([]);
    const [refunds, setRefunds] = useState<any[]>([]);
    const [refundCurrentPage, setRefundCurrentPage] = useState(1);
    const refundItemsPerPage = 8;

    // ── fetchFinancialData ────────────────────────────────────────────────
    const fetchFinancialData = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);

        try {
            // Wallets for this account
            const { data: walletData, error: walletError } = await supabase
                .from('account_wallets')
                .select('*')
                .eq('account_id', activeAccount.id)
                .order('currency');

            if (walletError) throw walletError;
            const fetchedWallets = (walletData || []).map((w: any) => ({ ...w, id: w.reference || w.currency }));
            setWallets(fetchedWallets);

            // Payouts for this account
            const { data: payoutData, error: payoutError } = await supabase
                .schema('payouts')
                .from('payouts')
                .select('*')
                .eq('account_id', activeAccount.id)
                .order('created_at', { ascending: false });

            if (payoutError) throw payoutError;

            setPayouts((payoutData || []).map((p: any) => {
                const matchingWallet = fetchedWallets.find(w => w.currency === p.currency);
                return {
                    id: p.id,
                    recipient: activeAccount.name,
                    eventName: activeAccount.name,
                    amount: p.amount,
                    currency: p.currency,
                    status: p.status,
                    requestedAt: formatDate(p.created_at),
                    processedAt: p.processed_at ? formatDate(p.processed_at) : undefined,
                    reference: p.reference,
                    payableWallet: matchingWallet?.reference || '—',
                    notes: p.admin_notes
                };
            }));

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

            // Fetch event titles and ticket codes for display
            const eventIds = [...new Set((refundData || []).map((r: any) => r.event_id).filter(Boolean))];
            const ticketIds = [...new Set((refundData || []).map((r: any) => r.ticket_id).filter(Boolean))];
            
            let eventMap: Record<string, string> = {};
            let ticketMap: Record<string, string> = {};

            if (eventIds.length > 0) {
                const { data: eventData } = await supabase
                    .from('events')
                    .select('id, title')
                    .in('id', eventIds);
                eventMap = (eventData || []).reduce((m: Record<string, string>, e: any) => { m[e.id] = e.title; return m; }, {});
            }

            if (ticketIds.length > 0) {
                const { data: ticketData } = await supabase
                    .schema('tickets')
                    .from('tickets')
                    .select('id, ticket_code')
                    .in('id', ticketIds);
                ticketMap = (ticketData || []).reduce((m: Record<string, string>, t: any) => { m[t.id] = t.ticket_code; return m; }, {});
            }

            setRefunds((refundData || []).map((r: any) => ({
                id: r.id,
                amount: r.amount,
                currency: r.currency,
                status: r.status,
                eventTitle: eventMap[r.event_id] || 'Unknown Event',
                eventId: r.event_id,
                ticketId: r.ticket_id,
                ticketCode: ticketMap[r.ticket_id] || '—',
                refundPercent: r.metadata?.refund_percent,
                reason: r.metadata?.msg || r.metadata?.cancel_reason || '-',
                date: formatDate(r.created_at),
            })));

        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to sync your financial records. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, wallets, supabase, showToast]);

    // Filtering Logic
    const filteredPayouts = useMemo(() => {
        return payouts.filter(p => {
            const matchesSearch = (p.reference?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 p.eventName?.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesSearch;
        });
    }, [payouts, searchTerm]);

    const filteredRefunds = useMemo(() => {
        return refunds.filter(r => {
            const matchesSearch = (r.eventTitle?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 r.ticketCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 r.reason?.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesSearch;
        });
    }, [refunds, searchTerm]);

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
    const handleExport = () => {
        const dataToExport = activeTab === 'payouts' ? payouts : refunds;
        if (dataToExport.length === 0) {
            showToast(`No ${activeTab} data to export.`, 'warning');
            return;
        }

        showToast(`Preparing ${activeTab} report...`, 'info');
        
        if (activeTab === 'payouts') {
            exportToCSV(
                payouts.map(p => ({
                    reference: p.reference,
                    amount: p.amount,
                    currency: p.currency,
                    payableWallet: p.payableWallet,
                    status: p.status,
                    requested_at: p.requestedAt,
                    processed_at: p.processedAt || '-',
                    notes: p.notes || ''
                })),
                `payout_report_${activeAccount?.name || 'org'}`
            );
        } else {
            exportToCSV(
                refunds.map(r => ({
                    date: r.date,
                    event: r.eventTitle,
                    amount: r.amount,
                    currency: r.currency,
                    status: r.status,
                    reason: r.reason
                })),
                `refund_report_${activeAccount?.name || 'org'}`
            );
        }
        showToast('Report downloaded.', 'success');
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
                actionLabel="Generate Report"
                onActionClick={handleExport}
                actionIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>}
                actionClassName="tour-revenue-report"
            />

            {/* Tabs */}
            <div className="tour-revenue-tabs">
                <Tabs
                    options={[
                    { id: 'payouts', label: 'Payouts' },
                    { id: 'refunds', label: `Refunds${refunds.length > 0 ? ` (${refunds.length})` : ''}` }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />
            </div>

            <TableToolbar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder={`Search ${activeTab}...`}
            >
                <select 
                    value={timeRange} 
                    onChange={(e) => setTimeRange(e.target.value)}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-interface-outline)',
                        background: 'transparent',
                        color: 'var(--color-utility-primaryText)',
                        fontSize: '13px'
                    }}
                >
                    <option value="all">All Time</option>
                    <option value="24h">Last 24h</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                </select>
            </TableToolbar>

            <div className={styles.tableWrapper}>
                {activeTab === 'payouts' ? (
                    <div className="tour-revenue-table">
                        <PayoutTable
                            payouts={filteredPayouts.slice((payoutCurrentPage - 1) * payoutItemsPerPage, payoutCurrentPage * payoutItemsPerPage)}
                            selectedIds={selectedIds}
                            onSelect={handleSelect}
                            onSelectAll={handleSelectAll}
                            currentPage={payoutCurrentPage}
                            totalPages={Math.ceil(filteredPayouts.length / payoutItemsPerPage)}
                            onPageChange={setPayoutCurrentPage}
                            isLoading={isLoading}
                        />
                    </div>
                ) : (
                    <RefundsTable
                        refunds={filteredRefunds}
                        currentPage={refundCurrentPage}
                        itemsPerPage={refundItemsPerPage}
                        onPageChange={setRefundCurrentPage}
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
                        target: '.tour-revenue-report',
                        title: 'Generate Reports',
                        content: 'Need to reconcile your accounts? Click here to download a CSV report of your payouts or refunds for the current view.',
                    },
                    {
                        target: '.tour-revenue-tabs',
                        title: 'Account Ledger',
                        content: 'Switch between "Payouts" to track requests and "Refunds" to view customer cancellations.',
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
                        <th style={refTh}>Event Name</th>
                        <th style={refTh}>Ticket Reference</th>
                        <th style={refTh}>Reason</th>
                        <th style={refTh}>Status</th>
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
                                <td style={refTd}>
                                    <div style={{ fontWeight: 500, fontFamily: 'var(--font-mono, monospace)', fontSize: '13px', opacity: 0.8 }}>
                                        {r.ticketCode}
                                    </div>
                                </td>
                                <td style={{ ...refTd, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>{r.reason}</td>
                                <td style={refTd}><Badge label={badge.label} variant={badge.variant} /></td>
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
