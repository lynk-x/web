"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * EventCancellationModal
 *
 * Called from the organizer events page when an organiser wants to cancel an event.
 *
 * On confirm:
 *  1. The parent performs supabase.from('events').update({ status: 'cancelled' }).eq('id', eventId)
 *  2. In production a server action / webhook should trigger refund_requests for all
 *     valid tickets — that is out of scope here and handled by DB trigger tr_cancel_event_refunds
 *     (if configured) or a separate admin job.
 *
 * Design note: we collect a cancellation reason so the organiser has a paper trail and
 * the reason can be shown to attendees in their ticket notifications.
 */

interface EventCancellationModalProps {
    eventTitle: string;
    eventId: string;
    ticketsSold: number;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
}

const CANCELLATION_REASONS = [
    "Venue issue or unavailability",
    "Insufficient ticket sales",
    "Organiser conflict or emergency",
    "Weather or safety concerns",
    "Event postponed (new date TBD)",
    "Other",
];

const EventCancellationModal: React.FC<EventCancellationModalProps> = ({
    eventTitle,
    eventId,
    ticketsSold,
    onClose,
    onConfirm,
}) => {
    const [reason, setReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    // Two-step confirmation for events with sold tickets
    const [confirmed, setConfirmed] = useState(false);

    const finalReason = reason === 'Other' ? customReason.trim() : reason;
    const isValid = !!finalReason && (reason !== 'Other' || customReason.trim().length >= 10);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) {
            setError('Please complete the cancellation reason.');
            return;
        }
        if (ticketsSold > 0 && !confirmed) {
            setError(`This event has ${ticketsSold} sold ticket(s). Check the box above to confirm you understand refund processing will be required.`);
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            await onConfirm(finalReason);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to cancel event.';
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div
                style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
                }}
                onClick={onClose}
            >
                <motion.div
                    onClick={e => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.95, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 16 }}
                    style={{
                        width: '100%', maxWidth: '500px',
                        background: 'var(--color-background-card, #13131a)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: '16px', overflow: 'hidden'
                    }}
                >
                    {/* Header */}
                    <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f87171' }}>
                                Cancel Event
                            </h2>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.55 }}>
                                {eventTitle}
                            </p>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.5, padding: 4, marginTop: 2 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    {/* Sold-tickets warning */}
                    {ticketsSold > 0 && (
                        <div style={{ margin: '16px 24px 0', padding: '12px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#f87171', fontWeight: 600 }}>
                                ⚠ {ticketsSold} ticket{ticketsSold !== 1 ? 's' : ''} already sold
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>
                                Cancelling this event will require issuing refunds to all ticket holders.
                                This action is irreversible.
                            </p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '10px', opacity: 0.8 }}>
                            Reason for cancellation
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                            {CANCELLATION_REASONS.map(r => (
                                <label
                                    key={r}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                                        fontSize: '14px', padding: '10px 12px', borderRadius: '10px',
                                        background: reason === r ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${reason === r ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="cancel_reason"
                                        value={r}
                                        checked={reason === r}
                                        onChange={() => setReason(r)}
                                        style={{ accentColor: '#ef4444' }}
                                    />
                                    {r}
                                </label>
                            ))}
                        </div>

                        {reason === 'Other' && (
                            <textarea
                                value={customReason}
                                onChange={e => setCustomReason(e.target.value)}
                                placeholder="Describe the cancellation reason..."
                                rows={3}
                                style={{
                                    width: '100%', padding: '10px 12px', borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'inherit', fontSize: '14px', resize: 'vertical', marginBottom: '16px',
                                    boxSizing: 'border-box', fontFamily: 'inherit'
                                }}
                            />
                        )}

                        {/* Confirmation checkbox for events with sold tickets */}
                        {ticketsSold > 0 && (
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '16px' }}>
                                <input
                                    type="checkbox"
                                    checked={confirmed}
                                    onChange={e => setConfirmed(e.target.checked)}
                                    style={{ marginTop: '2px', accentColor: '#ef4444' }}
                                />
                                <span style={{ fontSize: '13px', opacity: 0.75 }}>
                                    I understand that cancelling this event will require processing refunds
                                    for all {ticketsSold} ticket holder{ticketsSold !== 1 ? 's' : ''}.
                                </span>
                            </label>
                        )}

                        {error && (
                            <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{error}</p>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                                    color: 'inherit', fontSize: '14px', fontWeight: 500, cursor: 'pointer'
                                }}
                            >
                                Keep Event
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !isValid || (ticketsSold > 0 && !confirmed)}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '10px',
                                    background: (isSubmitting || !isValid || (ticketsSold > 0 && !confirmed))
                                        ? 'rgba(239,68,68,0.25)'
                                        : 'rgba(239,68,68,0.85)',
                                    border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600,
                                    cursor: (isSubmitting || !isValid) ? 'not-allowed' : 'pointer',
                                    transition: 'opacity 0.2s'
                                }}
                            >
                                {isSubmitting ? 'Cancelling…' : 'Cancel Event'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default EventCancellationModal;
