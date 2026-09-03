"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getErrorMessage } from '@/utils/error';
import styles from './EventCancellationModal.module.css';

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

/**
 * EventCancellationModal
 *
 * Renders a confirmation modal dialog when an organizer requests event cancellation.
 * Collects a cancellation reason and requires explicit checkbox acknowledgement
 * when existing tickets have already been sold.
 *
 * Styled using Lynk-X brand design tokens via EventCancellationModal.module.css.
 */
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
            const msg = err instanceof Error ? getErrorMessage(err) : 'Failed to cancel event.';
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className={styles.overlay} onClick={onClose}>
                <motion.div
                    className={styles.modal}
                    onClick={e => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.95, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 16 }}
                >
                    {/* Header */}
                    <div className={styles.header}>
                        <div>
                            <h2 className={styles.title}>Cancel Event</h2>
                            <p className={styles.subtitle}>{eventTitle}</p>
                        </div>
                        <button onClick={onClose} className={styles.closeBtn} aria-label="Close modal">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    {/* Sold-tickets warning */}
                    {ticketsSold > 0 && (
                        <div className={styles.warningBox}>
                            <p className={styles.warningTitle}>
                                ⚠ {ticketsSold} ticket{ticketsSold !== 1 ? 's' : ''} already sold
                            </p>
                            <p className={styles.warningText}>
                                Cancelling this event will require issuing refunds to all ticket holders.
                                This action is irreversible.
                            </p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <label className={styles.label}>
                            Reason for cancellation
                        </label>
                        <div className={styles.reasonsList}>
                            {CANCELLATION_REASONS.map(r => (
                                <label
                                    key={r}
                                    className={`${styles.reasonOption} ${reason === r ? styles.reasonOptionSelected : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="cancel_reason"
                                        value={r}
                                        checked={reason === r}
                                        onChange={() => setReason(r)}
                                        className={styles.radioInput}
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
                                className={styles.textarea}
                            />
                        )}

                        {/* Confirmation checkbox for events with sold tickets */}
                        {ticketsSold > 0 && (
                            <label className={styles.confirmCheckbox}>
                                <input
                                    type="checkbox"
                                    checked={confirmed}
                                    onChange={e => setConfirmed(e.target.checked)}
                                    className={styles.checkboxInput}
                                />
                                <span className={styles.checkboxText}>
                                    I understand that cancelling this event will require processing refunds
                                    for all {ticketsSold} ticket holder{ticketsSold !== 1 ? 's' : ''}.
                                </span>
                            </label>
                        )}

                        {error && (
                            <p className={styles.errorMessage}>{error}</p>
                        )}

                        <div className={styles.actions}>
                            <button
                                type="button"
                                onClick={onClose}
                                className={styles.cancelBtn}
                            >
                                Keep Event
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !isValid || (ticketsSold > 0 && !confirmed)}
                                className={styles.submitBtn}
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
