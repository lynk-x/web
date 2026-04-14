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

interface TicketTierManagerProps {
    tickets: Ticket[];
    currency: string;
    onCurrencyChange: (currency: string) => void;
    errors: Record<string, string>;
    onAdd: () => void;
    onRemove: (index: number) => void;
    onChange: (index: number, field: keyof Ticket, value: string | boolean) => void;
}

const TicketTierManager: React.FC<TicketTierManagerProps> = ({
    tickets, currency, onCurrencyChange, errors, onAdd, onRemove, onChange,
}) => {
    const { showToast } = useToast();

    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Tickets</h2>

            <div style={{ marginBottom: '32px', display: 'flex', gap: '24px' }}>
                <div className={styles.inputGroup} style={{ width: '200px' }}>
                    <label className={styles.label}>Event Currency</label>
                    <select
                        className={styles.selectInput}
                        value={currency}
                        onChange={(e) => onCurrencyChange(e.target.value)}
                    >
                        <option value="USD">USD - US Dollar</option>
                        <option value="KES">KES - Kenyan Shilling</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="UGX">UGX - Uganda Shilling</option>
                        <option value="TZS">TZS - Tanzania Shilling</option>
                    </select>
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
                                        <p className={styles.errorMessage}>{errors[`tickets.${index}.display_name`]}</p>
                                    </div>

                                    {/* Price */}
                                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                                        <label className={styles.label}>
                                            Price ({currency}) <span className={styles.requiredIndicator}>*Required</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className={`${styles.input} ${errors[`tickets.${index}.price`] ? styles.inputError : ''}`}
                                            placeholder="0.00"
                                            value={ticket.price}
                                            onChange={(e) => onChange(index, 'price', e.target.value)}
                                        />
                                        {ticket.price && parseFloat(ticket.price) > 0 && (
                                            <p style={{ fontSize: '11px', color: 'var(--color-brand-primary)', marginTop: '6px', fontWeight: 500 }}>
                                                You receive {currency} {(parseFloat(ticket.price) * 0.95).toFixed(2)} net
                                            </p>
                                        )}
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
                                    <div className={`${styles.inputGroup}`} style={{ flex: 1 }}>
                                        <label className={styles.label}>Description (Optional)</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            placeholder="What's included in this ticket?"
                                            value={ticket.description || ''}
                                            onChange={(e) => onChange(index, 'description', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button className={styles.addTicketBtn} onClick={onAdd}>+ Add Ticket Type</button>
                    </div>
        </section>
    );
};

export default TicketTierManager;
