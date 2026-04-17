"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatCurrency, formatDate } from '@/utils/format';
import SubPageHeader from '@/components/shared/SubPageHeader';
import Badge from '@/components/shared/Badge';
import Modal from '@/components/shared/Modal';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import type { BadgeVariant } from '@/types/shared';

interface RefundRequest {
    id: string;
    user_id: string;
    event_id: string | null;
    ticket_id: string;
    reason: string | null;
    amount: number | null;
    currency: string | null;
    status: string;
    processed_at: string | null;
    created_at: string;
    user_profile: { full_name: string; user_name: string } | null;
}

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'Pending', variant: 'warning' },
    approved: { label: 'Approved', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'error' },
    processed: { label: 'Processed', variant: 'info' },
};

export default function EventRefundsPage() {
    const { id: eventId } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [eventTitle, setEventTitle] = useState('');
    const [eventCurrency, setEventCurrency] = useState('KES');
    const [refunds, setRefunds] = useState<RefundRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Review modal
    const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
    const [refundAmount, setRefundAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchData = useCallback(async () => {
        if (!eventId || !activeAccount) return;
        setIsLoading(true);
        try {
            const [eventRes, refundsRes] = await Promise.all([
                supabase
                    .from('events')
                    .select('title, currency')
                    .eq('id', eventId)
                    .eq('account_id', activeAccount.id)
                    .single(),
                supabase
                    .from('refund_requests')
                    .select('*, user_profile:user_id(full_name, user_name)')
                    .eq('event_id', eventId)
                    .order('created_at', { ascending: false }),
            ]);

            if (eventRes.data) {
                setEventTitle(eventRes.data.title);
                setEventCurrency(eventRes.data.currency);
            }
            if (refundsRes.error) throw refundsRes.error;

            setRefunds(refundsRes.data || []);
        } catch (e: any) {
            showToast('Failed to load refund requests', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, activeAccount, supabase, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openReview = (refund: RefundRequest) => {
        setSelectedRefund(refund);
        setRefundAmount(refund.amount?.toString() || '');
    };

    const handleDecision = async (decision: 'approved' | 'rejected') => {
        if (!selectedRefund) return;

        if (decision === 'approved') {
            const numAmount = parseFloat(refundAmount);
            if (!numAmount || numAmount <= 0) {
                showToast('Enter a valid refund amount', 'error');
                return;
            }
        }

        setIsProcessing(true);
        try {
            const update: Record<string, any> = {
                status: decision,
                processed_at: new Date().toISOString(),
            };

            if (decision === 'approved') {
                update.amount = parseFloat(refundAmount);
                update.currency = eventCurrency;
            }

            const { error } = await supabase
                .from('refund_requests')
                .update(update)
                .eq('id', selectedRefund.id);

            if (error) throw error;

            showToast(`Refund ${decision}`, 'success');
            setSelectedRefund(null);
            fetchData();
        } catch (e: any) {
            showToast(e.message || `Failed to ${decision === 'approved' ? 'approve' : 'reject'} refund`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const pendingCount = refunds.filter(r => r.status === 'pending').length;

    return (
        <div className={adminStyles.page}>
            <SubPageHeader
                title="Refund Requests"
                subtitle={eventTitle
                    ? `${pendingCount} pending for "${eventTitle}"`
                    : 'Manage refund requests'}
                backHref={`/dashboard/organize/events/${eventId}`}
            />

            {isLoading ? (
                <div className={adminStyles.loadingContainer}><div className={adminStyles.spinner} /></div>
            ) : refunds.length === 0 ? (
                <div className={adminStyles.emptyState}>
                    <p>No refund requests for this event.</p>
                </div>
            ) : (
                <table className={adminStyles.table}>
                    <thead>
                        <tr>
                            <th>Requested</th>
                            <th>Attendee</th>
                            <th>Reason</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {refunds.map(r => {
                            const badge = STATUS_MAP[r.status] || { label: r.status, variant: 'neutral' as BadgeVariant };
                            return (
                                <tr key={r.id}>
                                    <td>{formatDate(r.created_at)}</td>
                                    <td>
                                        {r.user_profile
                                            ? r.user_profile.full_name || `@${r.user_profile.user_name}`
                                            : r.user_id.slice(0, 8) + '...'}
                                    </td>
                                    <td
                                        title={r.reason || undefined}
                                        style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: r.reason ? 'help' : 'default' }}
                                    >
                                        {r.reason || '—'}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>
                                        {r.amount != null ? formatCurrency(r.amount, r.currency || eventCurrency) : '—'}
                                    </td>
                                    <td><Badge variant={badge.variant} label={badge.label} /></td>
                                    <td>
                                        {r.status === 'pending' && (
                                            <button
                                                className={adminStyles.secondaryButton}
                                                onClick={() => openReview(r)}
                                                style={{ fontSize: 13, padding: '4px 10px' }}
                                            >
                                                Review
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            {selectedRefund && (
                <Modal isOpen={true} onClose={() => setSelectedRefund(null)} title="Review Refund Request">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ background: 'var(--color-bg-subtle)', padding: 16, borderRadius: 8, fontSize: 14 }}>
                            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
                                {selectedRefund.user_profile?.full_name || selectedRefund.user_id.slice(0, 8)}
                            </p>
                            <p style={{ margin: '0 0 4px', color: 'var(--color-text-secondary)' }}>
                                Ticket: {selectedRefund.ticket_id.slice(0, 12)}...
                            </p>
                            <p style={{ margin: '0 0 4px', color: 'var(--color-text-secondary)' }}>
                                Requested: {formatDate(selectedRefund.created_at)}
                            </p>
                            {selectedRefund.reason && (
                                <p style={{ margin: '8px 0 0' }}>
                                    <strong>Reason:</strong> {selectedRefund.reason}
                                </p>
                            )}
                        </div>

                        <label className={adminStyles.fieldLabel}>
                            Refund Amount ({eventCurrency})
                            <input
                                className={adminStyles.input}
                                type="number"
                                min="0"
                                step="0.01"
                                value={refundAmount}
                                onChange={e => setRefundAmount(e.target.value)}
                                placeholder="Amount to refund"
                            />
                        </label>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                            <button
                                className={adminStyles.dangerButton}
                                onClick={() => handleDecision('rejected')}
                                disabled={isProcessing}
                            >
                                Reject
                            </button>
                            <button
                                className={adminStyles.primaryButton}
                                onClick={() => handleDecision('approved')}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Processing...' : 'Approve Refund'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
