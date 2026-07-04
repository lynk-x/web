"use client";

/**
 * TicketTierManager — manages the list of paid ticket tiers within the event form.
 *
 * This was extracted from EventForm.tsx to keep that file manageable.
 * Accepts the current ticket list, per-field error map, and callbacks for
 * add / remove / change operations.
 */

import React from 'react';
import styles from './EventForm.module.css';
import type { OrganizerEventTicket as Ticket } from '@/types/organize';
import { useToast } from '@/components/ui/Toast';
import { CurrencySelector } from '@/components/ui/CurrencySelector';
import type { OrganizerOnboardingStatus } from '@/hooks/useOrganizerOnboarding';

interface TicketTierManagerProps {
    tickets: Ticket[];
    currency: string;
    isPaid: boolean;
    onPaidChange: (isPaid: boolean) => void;
    errors: Record<string, string>;
    onAdd: () => void;
    onRemove: (index: number) => void;
    onChange: (index: number, field: keyof Ticket, value: string | boolean) => void;
    onboardingStatus?: OrganizerOnboardingStatus | null;
}

const TicketTierManager: React.FC<TicketTierManagerProps> = ({
    tickets, currency, isPaid, onPaidChange, errors, onAdd, onRemove, onChange, onboardingStatus,
}) => {
    const { showToast } = useToast();
    const canCreatePaidEvents = onboardingStatus?.can_create_paid_events ?? true;

    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Tickets</h2>

            <div style={{ marginBottom: '32px', display: 'flex', gap: '24px', alignItems: 'center' }}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Is this event free?</label>
                    <div className={styles.toggleRow}>
                        <label className={styles.checkboxLabel} title={!canCreatePaidEvents ? 'Complete account verification to create paid tickets.' : undefined}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={!isPaid}
                                onChange={(e) => {
                                    if (e.target.checked === false && !canCreatePaidEvents) {
                                        showToast('Complete account verification before creating paid tickets.', 'warning');
                                        return;
                                    }
                                    onPaidChange(!e.target.checked);
                                }}
                            />
                            Yes, this event is free for all attendees
                        </label>
                    </div>
                </div>
            </div>
            
            <div className={styles.ticketList}>
                        {tickets.map((ticket, index) => (
                            <div key={index} className={styles.ticketItem}>
                                <div className={styles.ticketRow}>
                                    {/* Ticket Name */}
                                    <div className={styles.inputGroup} style={{ flex: 2 }}>
                                        <label className={styles.label}>
                                            Ticket Name <span className={styles.requiredIndicator}>*Required</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={`${styles.input} ${errors[`tickets.${index}.display_name`] ? styles.inputError : ''}`}
                                            placeholder="e.g. VIP Admission"
                                            value={ticket.display_name}
                                            onChange={(e) => onChange(index, 'display_name', e.target.value)}
                                        />
                                        {errors[`tickets.${index}.display_name`] && (
                                            <p className={styles.errorMessage}>{errors[`tickets.${index}.display_name`]}</p>
                                        )}
                                    </div>

                                    {/* Price */}
                                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                                        <label className={styles.label}>
                                            Price {isPaid && `(${currency})`} <span className={styles.requiredIndicator}>*Required</span>
                                        </label>
                                        {isPaid ? (
                                            <>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className={`${styles.input} ${errors[`tickets.${index}.price`] ? styles.inputError : ''}`}
                                                    placeholder="0.00"
                                                    value={ticket.price}
                                                    onChange={(e) => onChange(index, 'price', e.target.value)}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <input
                                                    type="text"
                                                    className={styles.input}
                                                    value="FREE"
                                                    disabled
                                                    style={{ fontWeight: 700 }}
                                                />
                                            </>
                                        )}
                                        {isPaid && errors[`tickets.${index}.price`] && (
                                            <p className={styles.errorMessage}>{errors[`tickets.${index}.price`]}</p>
                                        )}
                                    </div>

                                    {/* Quantity */}
                                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                                        <label className={styles.label}>
                                            Quantity <span className={styles.requiredIndicator}>*Required</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            className={`${styles.input} ${errors[`tickets.${index}.capacity`] ? styles.inputError : ''}`}
                                            placeholder="100"
                                            value={ticket.capacity}
                                            onChange={(e) => onChange(index, 'capacity', e.target.value)}
                                        />
                                        {errors[`tickets.${index}.capacity`] && (
                                            <p className={styles.errorMessage}>{errors[`tickets.${index}.capacity`]}</p>
                                        )}
                                    </div>

                                </div>

                                {/* Remove Button (Top Right) */}
                                <button className={styles.removeBtn} onClick={() => onRemove(index)} title="Remove Ticket">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18"></path>
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    </svg>
                                </button>

                                <div className={styles.ticketAdvanced}>
                                    <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                        <label className={styles.label}>Description (Optional)</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            placeholder="What's included in this ticket? e.g. Free drink, backstage access..."
                                            value={ticket.description || ''}
                                            onChange={(e) => onChange(index, 'description', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button className={styles.saveBtn} onClick={onAdd} style={{ width: '100%', marginTop: '24px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Add Ticket Type
                        </button>
                    </div>
        </section>
    );
};

export default TicketTierManager;
