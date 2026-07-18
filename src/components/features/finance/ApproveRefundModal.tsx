"use client";

import React, { useEffect, useState } from 'react';
import Modal from '@/components/shared/Modal';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { formatCurrency } from '@/utils/format';
import type { Refund } from './RefundTable';

interface ApproveRefundModalProps {
    refund: Refund | null;
    onClose: () => void;
    onConfirm: (refund: Refund, amount: number) => Promise<void> | void;
}

/**
 * Tickets are non-refundable by default — approving a refund request is a
 * discretionary exception, so the organizer must explicitly set the amount
 * to grant (capped at the ticket's original purchase price) rather than the
 * platform computing one automatically.
 */
const ApproveRefundModal: React.FC<ApproveRefundModalProps> = ({ refund, onClose, onConfirm }) => {
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (refund) {
            setAmount(refund.ticketPrice != null ? String(refund.ticketPrice) : '');
        }
    }, [refund]);

    if (!refund) return null;

    const maxAmount = refund.ticketPrice ?? undefined;
    const currency = refund.ticketCurrency ?? refund.currency ?? '';
    const parsedAmount = Number(amount);
    const isValid = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0 &&
        (maxAmount === undefined || parsedAmount <= maxAmount);

    const handleConfirm = async () => {
        if (!isValid) return;
        setIsSubmitting(true);
        try {
            await onConfirm(refund, parsedAmount);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title="Approve Refund"
            footer={
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%' }}>
                    <button className={adminStyles.btnSecondary} onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button
                        className={adminStyles.btnPrimary}
                        onClick={handleConfirm}
                        disabled={!isValid || isSubmitting}
                    >
                        {isSubmitting ? 'Approving...' : 'Approve Refund'}
                    </button>
                </div>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <div style={{ fontSize: '13px', opacity: 0.7 }}>{refund.event_name}</div>
                    <div style={{ fontSize: '13px', opacity: 0.7, fontFamily: 'monospace' }}>{refund.ticket_code}</div>
                </div>
                {refund.reason && (
                    <div>
                        <label className={adminStyles.label}>Attendee&apos;s Reason</label>
                        <p style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>{refund.reason}</p>
                    </div>
                )}
                <div className={adminStyles.inputGroup}>
                    <label className={adminStyles.label}>
                        Refund Amount {currency && `(${currency})`}
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={maxAmount}
                        className={adminStyles.input}
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        autoFocus
                    />
                    {maxAmount !== undefined && (
                        <p style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>
                            Cannot exceed the ticket&apos;s purchase price of {formatCurrency(maxAmount, currency)}.
                        </p>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default ApproveRefundModal;
