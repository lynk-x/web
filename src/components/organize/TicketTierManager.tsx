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

const HelpTooltip: React.FC<{ text: string }> = ({ text }) => {
    const [isVisible, setIsVisible] = React.useState(false);

    return (
        <div className={styles.tooltipWrapper}>
            <div 
                className={styles.helpIcon} 
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsVisible(!isVisible);
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            </div>
            <div className={`${styles.tooltip} ${isVisible ? styles.tooltipVisible : ''}`}>
                {text}
            </div>
        </div>
    );
};

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
                            <div key={index} className={styles.ticketItem} style={ticket.has_premium_upsell ? { borderLeft: '4px solid var(--color-brand-secondary)' } : {}}>
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
                                        {(() => {
                                            const standardPrices = tickets
                                                .filter((t, i) => i !== index && !t.has_premium_upsell)
                                                .map(t => parseFloat(t.price) || 0);
                                            const maxStandard = standardPrices.length > 0 ? Math.max(...standardPrices) : 0;
                                            const isPriceTooLow = ticket.has_premium_upsell && (parseFloat(ticket.price) || 0) <= maxStandard;

                                            return (
                                                <>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className={`${styles.input} ${errors[`tickets.${index}.price`] || isPriceTooLow ? styles.inputError : ''}`}
                                                        placeholder="0.00"
                                                        value={ticket.price}
                                                        onChange={(e) => onChange(index, 'price', e.target.value)}
                                                    />
                                                    {isPriceTooLow && (
                                                        <p className={styles.errorMessage} style={{ fontSize: '10px' }}>
                                                            Premium tiers must be priced above standard tickets
                                                        </p>
                                                    )}
                                                </>
                                            );
                                        })()}
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

                                {/* Advanced optional fields */}
                                <div className={styles.ticketAdvanced} style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
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

                                    {/* Premium Upsell Toggle */}
                                    {tickets.length > 1 && (
                                        <div className={styles.toggleRow} style={{ marginTop: '20px' }}>
                                            <label className={styles.checkboxLabel} style={{ fontWeight: 600 }}>
                                                <input 
                                                    type="checkbox" 
                                                    className={styles.checkbox}
                                                    checked={ticket.has_premium_upsell || false}
                                                    onChange={(e) => {
                                                        const isChecked = e.target.checked;
                                                        
                                                        // Enforce Scarcity: At least one ticket must remain standard
                                                        if (isChecked) {
                                                            const standardTiers = tickets.filter(t => !t.has_premium_upsell);
                                                            if (standardTiers.length <= 1) {
                                                                showToast("Scarcity Enforcement: At least one ticket tier must remain standard.", "warning");
                                                                return;
                                                            }

                                                            const standardPrices = standardTiers
                                                                .filter((_, i) => i !== index)
                                                                .map(t => parseFloat(t.price) || 0);
                                                            const maxStandard = standardPrices.length > 0 ? Math.max(...standardPrices) : 0;
                                                            const currentPrice = parseFloat(ticket.price) || 0;
                                                            
                                                            if (currentPrice <= maxStandard) {
                                                                const suggestedPrice = (maxStandard + 10).toString();
                                                                onChange(index, 'price', suggestedPrice);
                                                                showToast("Premium tiers must be priced above standard tickets. Price adjusted.", "info");
                                                            }
                                                        }
                                                        onChange(index, 'has_premium_upsell', isChecked);
                                                    }}
                                                />
                                                <span style={{ color: 'var(--color-brand-primaryText)' }}>Premium Ad-Free Experience</span>
                                                <HelpTooltip text="If selected, this ticket tier grants attendees an exclusive, ad-free experience within the event's community forums. We recommend offering this for your high-value tiers to provide a superior, distraction-free experience at a premium price point." />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <button className={styles.addTicketBtn} onClick={onAdd}>+ Add Ticket Type</button>
                    </div>
        </section>
    );
};

export default TicketTierManager;
