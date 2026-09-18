"use client";

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatCurrency } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import Spinner from '@/components/shared/Spinner';
import Badge from '@/components/shared/Badge';
import DataTable, { Column } from '@/components/shared/DataTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import type { BadgeVariant } from '@/types/shared';

interface EventBasics {
    id: string;
    title: string;
    organizer: string;
}

interface FinanceSummary {
    currency: string;
    gross_sales: number;
    platform_fees_total: number;
    platform_tax_total: number;
    net_payable_to_organizer: number;
    tickets_issued: number;
    transaction_count: number;
    refund_total: number;
    refund_count: number;
    escrow_status: 'not_applicable' | 'held' | 'released';
    payout_status: string | null;
    payout_amount: number | null;
}

interface TransactionRow {
    id: string;
    amount: number;
    currency: string;
    status: string;
    category: string;
    reason: string;
    reference: string;
    created_at: string;
    sender_name: string | null;
    recipient_name: string | null;
}

interface RefundRow {
    id: string;
    refund_id: string;
    reference: string;
    ticket_id: string | null;
    ticket_code: string | null;
    requester_name: string | null;
    reason: string;
    amount: number;
    currency: string;
    status: string;
    processed_at: string | null;
    requested_at: string;
}

const TX_STATUS_BADGE: Record<string, BadgeVariant> = {
    completed: 'success',
    pending: 'warning',
    failed: 'error',
    cancelled: 'subtle',
    refunded: 'info',
};

const REFUND_STATUS_BADGE: Record<string, BadgeVariant> = {
    processed: 'success',
    approved: 'info',
    pending: 'warning',
    rejected: 'error',
};

const ESCROW_LABEL: Record<FinanceSummary['escrow_status'], string> = {
    not_applicable: 'No completed sales yet',
    held: 'Held in escrow — releases once the event completes',
    released: 'Released to organizer wallet',
};

/**
 * Admin sub-page giving a per-event financial breakdown — gross sales,
 * platform fees/tax, net payable, escrow/settlement status, and full
 * transaction/refund ledgers. Split out as a real sub-route matching the
 * event detail page's other sub-areas (ticketing, attendees, community,
 * moderation).
 */
export default function AdminEventFinancePage(props: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div className={adminStyles.container}><Spinner label="Loading..." centered /></div>}>
            <AdminEventFinanceContent {...props} />
        </Suspense>
    );
}

function AdminEventFinanceContent({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const eventCreatedAt = searchParams.get('created_at');
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [event, setEvent] = useState<EventBasics | null>(null);
    const [summary, setSummary] = useState<FinanceSummary | null>(null);
    const [transactions, setTransactions] = useState<TransactionRow[]>([]);
    const [refunds, setRefunds] = useState<RefundRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTxLoading, setIsTxLoading] = useState(true);
    const [isRefundsLoading, setIsRefundsLoading] = useState(true);
    const [approvingRefundId, setApprovingRefundId] = useState<string | null>(null);

    const fetchEvent = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!eventCreatedAt) {
                showToast('Missing event reference — please open this page from the events list.', 'error');
                router.push('/dashboard/admin/events');
                return;
            }

            const { data, error } = await supabase.schema('api').rpc('get_admin_event_details', {
                p_event_id: id,
                p_event_created_at: eventCreatedAt,
            });
            if (error) throw error;
            if (!data) {
                showToast('Event not found.', 'error');
                router.push('/dashboard/admin/events');
                return;
            }

            setEvent(data.event as EventBasics);

            const { data: summaryData, error: summaryError } = await supabase.schema('api').rpc('get_admin_event_finance_summary', {
                p_event_id: id,
                p_event_created_at: eventCreatedAt,
            });
            if (summaryError) throw summaryError;
            setSummary(summaryData as FinanceSummary);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load event finance details.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, eventCreatedAt, supabase, showToast, router]);

    const fetchTransactions = useCallback(async () => {
        if (!eventCreatedAt) return;
        setIsTxLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('get_admin_event_transactions', {
                p_event_id: id,
                p_event_created_at: eventCreatedAt,
                p_limit: 100,
                p_offset: 0,
            });
            if (error) throw error;
            setTransactions((data || []) as TransactionRow[]);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load transactions.', 'error');
        } finally {
            setIsTxLoading(false);
        }
    }, [id, eventCreatedAt, supabase, showToast]);

    const fetchRefunds = useCallback(async () => {
        if (!eventCreatedAt) return;
        setIsRefundsLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('get_admin_event_refunds', {
                p_event_id: id,
                p_event_created_at: eventCreatedAt,
                p_limit: 100,
                p_offset: 0,
            });
            if (error) throw error;
            const items = (data || []) as Omit<RefundRow, 'id'>[];
            setRefunds(items.map((r) => ({ ...r, id: r.refund_id })));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load refunds.', 'error');
        } finally {
            setIsRefundsLoading(false);
        }
    }, [id, eventCreatedAt, supabase, showToast]);

    useEffect(() => { fetchEvent(); }, [fetchEvent]);
    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
    useEffect(() => { fetchRefunds(); }, [fetchRefunds]);

    const handleApproveRefund = useCallback(async (refundId: string) => {
        setApprovingRefundId(refundId);
        try {
            const { data, error } = await supabase.schema('api').rpc('bulk_approve_refund_requests', {
                p_request_ids: [refundId],
            });
            if (error) throw error;
            if (!data?.processed_count) {
                showToast('Refund could not be approved — it may have already been processed.', 'error');
                fetchRefunds();
                return;
            }
            showToast('Refund approved.', 'success');
            fetchRefunds();
            fetchEvent();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to approve refund.', 'error');
        } finally {
            setApprovingRefundId(null);
        }
    }, [supabase, showToast, fetchRefunds, fetchEvent]);

    if (isLoading || !event || !summary) {
        return (
            <div className={adminStyles.container}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%' }}>
                    <Spinner label="Loading event finance details..." centered />
                </div>
            </div>
        );
    }

    const transactionColumns: Column<TransactionRow>[] = [
        { header: 'Reference', render: (t) => <code style={{ fontSize: '11px' }}>{t.reference}</code> },
        { header: 'Reason', render: (t) => t.reason.replace(/_/g, ' ') },
        { header: 'Category', render: (t) => t.category },
        {
            header: 'Amount',
            render: (t) => formatCurrency(t.amount, t.currency),
        },
        {
            header: 'Status',
            render: (t) => <Badge label={t.status.toUpperCase()} variant={TX_STATUS_BADGE[t.status] || 'neutral'} showDot />,
        },
        { header: 'Party', render: (t) => t.sender_name || t.recipient_name || '—' },
        { header: 'Date', render: (t) => formatDate(t.created_at) },
    ];

    const refundColumns: Column<RefundRow>[] = [
        { header: 'Reference', render: (r) => <code style={{ fontSize: '11px' }}>{r.reference}</code> },
        { header: 'Ticket', render: (r) => r.ticket_code || '—' },
        { header: 'Requested By', render: (r) => r.requester_name || 'Unknown' },
        { header: 'Reason', render: (r) => r.reason },
        { header: 'Amount', render: (r) => formatCurrency(r.amount, r.currency) },
        {
            header: 'Status',
            render: (r) => <Badge label={r.status.toUpperCase()} variant={REFUND_STATUS_BADGE[r.status] || 'neutral'} showDot />,
        },
        { header: 'Requested', render: (r) => formatDate(r.requested_at) },
        { header: 'Processed', render: (r) => r.processed_at ? formatDate(r.processed_at) : '—' },
    ];

    return (
        <div className={adminStyles.container}>
            <PageHeader
                title="Finance"
                subtitle={`${event.title} — organized by ${event.organizer}.`}
                closeHref={`/dashboard/admin/events/${id}?created_at=${encodeURIComponent(eventCreatedAt || '')}`}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <StatCard label="Gross Sales" value={formatCurrency(summary.gross_sales, summary.currency)} />
                <StatCard label="Fees + Tax" value={formatCurrency(summary.platform_fees_total + summary.platform_tax_total, summary.currency)} />
                <StatCard label="Net Payable to Organizer" value={formatCurrency(summary.net_payable_to_organizer, summary.currency)} trend="positive" />
                <StatCard
                    label="Refunded"
                    value={formatCurrency(summary.refund_total, summary.currency)}
                    change={`${summary.refund_count} request${summary.refund_count === 1 ? '' : 's'}`}
                    trend={summary.refund_count > 0 ? 'negative' : 'neutral'}
                />
            </div>

            <div className={adminStyles.pageCard} style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h3 style={{ margin: '0 0 4px' }}>Settlement Status</h3>
                    <p style={{ opacity: 0.6, fontSize: '13px', margin: 0 }}>{ESCROW_LABEL[summary.escrow_status]}</p>
                </div>
                {summary.payout_status && (
                    <div style={{ textAlign: 'right' }}>
                        <Badge
                            label={summary.payout_status.toUpperCase()}
                            variant={summary.payout_status === 'completed' ? 'success' : summary.payout_status === 'failed' || summary.payout_status === 'rejected' ? 'error' : 'warning'}
                            showDot
                        />
                        {summary.payout_amount != null && (
                            <p style={{ opacity: 0.6, fontSize: '12px', margin: '4px 0 0' }}>
                                {formatCurrency(summary.payout_amount, summary.currency)} settled to organizer wallet
                            </p>
                        )}
                    </div>
                )}
            </div>

            <Tabs defaultValue="transactions">
                <TabsList style={{ width: 'fit-content' }}>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="refunds">Refunds</TabsTrigger>
                </TabsList>

                <TabsContent value="transactions">
                    <DataTable<TransactionRow>
                        data={transactions}
                        columns={transactionColumns}
                        isLoading={isTxLoading}
                        emptyMessage="No transactions recorded for this event yet."
                    />
                </TabsContent>

                <TabsContent value="refunds">
                    <DataTable<RefundRow>
                        data={refunds}
                        columns={refundColumns}
                        isLoading={isRefundsLoading}
                        emptyMessage="No refund requests for this event."
                        getActions={(r) => r.status === 'pending' ? [
                            {
                                label: approvingRefundId === r.id ? 'Approving...' : 'Approve',
                                onClick: () => handleApproveRefund(r.id),
                                variant: 'success',
                                disabled: approvingRefundId !== null,
                            },
                        ] : []}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
