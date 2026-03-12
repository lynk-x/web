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

interface TicketTierManagerProps {
    tickets: Ticket[];
    errors: Record<string, string>;
    isPaidTicketingEnabled: boolean;
    isPaid: boolean;
    onTogglePaid: () => void;
    onAdd: () => void;
    onRemove: (index: number) => void;
    onChange: (index: number, field: keyof Ticket, value: string) => void;
    /** Total capacity field value */
    limit: string;
    onLimitChange: (value: string) => void;
}

const TicketTierManager: React.FC<TicketTierManagerProps> = ({
    tickets, errors, isPaidTicketingEnabled, isPaid,
    onTogglePaid, onAdd, onRemove, onChange, limit, onLimitChange,
}) => {
    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Tickets</h2>
            <div className={styles.formGrid}>
                {/* Total capacity */}
                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Total Capacity</label>
                    <input
                        type="number"
                        name="limit"
                        className={styles.input}
                        placeholder="Unlimited"
                        value={limit}
                        onChange={(e) => onLimitChange(e.target.value)}
                    />
                    <p style={{ fontSize: '13px', opacity: 0.6, marginTop: '8px' }}>
                        Maximum number of attendees allowed. Leave blank for unlimited.
                    </p>
                </div>

                {/* Paid ticketing toggle */}
                {isPaidTicketingEnabled ? (
                    <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                        <div className={styles.toggleRow}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={isPaid}
                                    onChange={onTogglePaid}
                                />
                                <strong>Paid Event</strong> (Requires tickets)
                            </label>
                        </div>
                        <p style={{ fontSize: '13px', opacity: 0.6, marginTop: '8px', marginLeft: '32px' }}>
                            If unchecked, the event will be free for all attendees.
                        </p>
                    </div>
                ) : (
                    <div className={`${styles.inputGroup} ${styles.fullWidth}`} style={{ opacity: 0.5 }}>
                        <p style={{ fontSize: '13px', color: 'var(--color-brand-primary)', fontWeight: 600 }}>
                            Paid ticketing is currently disabled by administrator.
                        </p>
                    </div>
                )}
            </div>

            {/* Ticket tier list — only when isPaid */}
            {isPaid && (
                <div style={{ marginTop: '24px' }}>
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
                                        <p className={styles.errorMessage}>{errors[`tickets.${index}.display_name`]}</p>
                                    </div>

                                    {/* Price */}
                                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                                        <label className={styles.label}>
                                            Price <span className={styles.requiredIndicator}>*Required</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            className={`${styles.input} ${errors[`tickets.${index}.price`] ? styles.inputError : ''}`}
                                            placeholder="0.00"
                                            value={ticket.price}
                                            onChange={(e) => onChange(index, 'price', e.target.value)}
                                        />
                                        <p className={styles.errorMessage}>{errors[`tickets.${index}.price`]}</p>
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
                                        <p className={styles.errorMessage}>{errors[`tickets.${index}.capacity`]}</p>
                                    </div>

                                    {/* Remove */}
                                    <button className={styles.removeBtn} onClick={() => onRemove(index)} title="Remove Ticket">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>

                                {/* Advanced optional fields */}
                                <div className={styles.ticketAdvanced}>
                                    <div className={`${styles.inputGroup} ${styles.ticketDescription}`}>
                                        <label className={styles.label}>Description (Optional)</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            placeholder="What's included in this ticket?"
                                            value={ticket.description || ''}
                                            onChange={(e) => onChange(index, 'description', e.target.value)}
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Sale Start</label>
                                        <input
                                            type="datetime-local"
                                            className={styles.input}
                                            value={ticket.saleStart || ''}
                                            onChange={(e) => onChange(index, 'saleStart', e.target.value)}
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Sale End</label>
                                        <input
                                            type="datetime-local"
                                            className={`${styles.input} ${errors[`tickets.${index}.saleEnd`] ? styles.inputError : ''}`}
                                            value={ticket.saleEnd || ''}
                                            onChange={(e) => onChange(index, 'saleEnd', e.target.value)}
                                        />
                                        <p className={styles.errorMessage}>{errors[`tickets.${index}.saleEnd`]}</p>
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Max Per Order</label>
                                        <input
                                            type="number"
                                            className={`${styles.input} ${errors[`tickets.${index}.maxPerOrder`] ? styles.inputError : ''}`}
                                            placeholder="10"
                                            value={ticket.maxPerOrder || ''}
                                            onChange={(e) => onChange(index, 'maxPerOrder', e.target.value)}
                                        />
                                        <p className={styles.errorMessage}>{errors[`tickets.${index}.maxPerOrder`]}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button className={styles.addTicketBtn} onClick={onAdd}>+ Add Ticket Type</button>
                    </div>
                </div>
            )}
        </section>
    );
};

export default TicketTierManager;
