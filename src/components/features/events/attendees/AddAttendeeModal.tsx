"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/shared/Modal';
import Button from '@/components/shared/Button';
import Spinner from '@/components/shared/Spinner';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/error';

/**
 * Modal dialog for manually issuing event tickets/adding attendees.
 * Supports: Email, Phone Number, Ticket Tier, and Quantity fields.
 */
export interface AddAttendeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    accountId?: string;
    eventCreatedAt?: string;
    onSuccess: () => void;
}

interface TierOption {
    id: string;
    display_name: string;
    price?: number;
    currency?: string;
}

export default function AddAttendeeModal({
    isOpen,
    onClose,
    eventId,
    onSuccess
}: AddAttendeeModalProps) {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();

    const [tiers, setTiers] = useState<TierOption[]>([]);
    const [isLoadingTiers, setIsLoadingTiers] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form fields — strictly Email, Phone Number, Ticket Tier, Quantity
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedTierId, setSelectedTierId] = useState('');
    const [quantity, setQuantity] = useState(1);

    // Fetch ticket tiers for the event when modal opens
    useEffect(() => {
        if (!isOpen || !eventId) return;

        const fetchTiers = async () => {
            setIsLoadingTiers(true);
            try {
                const { data, error } = await supabase
                    .schema('api')
                    .from('v1_ticket_tiers')
                    .select('id, display_name, price, currency')
                    .eq('event_id', eventId);

                if (error) throw error;

                if (data && data.length > 0) {
                    const mapped = data.map((t: any) => ({
                        id: t.id,
                        display_name: t.display_name || 'General Admission',
                        price: t.price,
                        currency: t.currency
                    }));
                    setTiers(mapped);
                    setSelectedTierId(mapped[0].id);
                } else {
                    setTiers([]);
                }
            } catch (err: unknown) {
                console.error('Error fetching ticket tiers for add attendee:', err);
                showToast('Could not load ticket tiers for this event.', 'error');
            } finally {
                setIsLoadingTiers(false);
            }
        };

        fetchTiers();
    }, [isOpen, eventId, supabase, showToast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTierId) {
            showToast('Please select a ticket tier.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const providerRef = `MANUAL-${Date.now()}`;
            
            // 1. Try bulk_purchase_tickets RPC
            const { error: rpcError } = await supabase.schema('api').rpc('bulk_purchase_tickets', {
                p_items: [{
                    event_id: eventId,
                    tier_id: selectedTierId,
                    quantity: Number(quantity),
                    reservation_id: null,
                    promo_code: null,
                }],
                p_provider: 'manual_organizer',
                p_provider_ref: providerRef
            });

            if (rpcError) {
                console.warn('RPC bulk_purchase_tickets failed, attempting fallback insertion:', rpcError);
                // Fallback direct ticket insertion
                const currentUser = (await supabase.auth.getUser()).data.user;
                const ticketsToInsert = Array.from({ length: Number(quantity) }).map(() => ({
                    event_id: eventId,
                    ticket_tier_id: selectedTierId,
                    user_id: currentUser?.id || null,
                    status: 'valid',
                    ticket_code: `TKT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
                }));

                const { error: insertError } = await supabase
                    .schema('api')
                    .from('v1_tickets')
                    .insert(ticketsToInsert);

                if (insertError) throw insertError;
            }

            showToast(`Successfully issued ${quantity} attendee ticket(s).`, 'success');
            
            // Reset form
            setEmail('');
            setPhone('');
            setQuantity(1);

            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error('Error issuing attendee ticket:', err);
            showToast(getErrorMessage(err) || 'Failed to add attendee ticket.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Attendee"
            size="medium"
            footer={
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting || isLoadingTiers || !selectedTierId}
                    >
                        {isSubmitting ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Spinner size={14} /> Issuing Ticket...
                            </span>
                        ) : (
                            'Issue Ticket'
                        )}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px', opacity: 0.7, margin: '0 0 4px 0', lineHeight: '1.5' }}>
                    Manually issue an event ticket by entering the attendee details below.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>
                        Email Address
                    </label>
                    <input
                        type="email"
                        placeholder="e.g. attendee@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>
                        Phone Number
                    </label>
                    <input
                        type="tel"
                        placeholder="e.g. +254 700 000 000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <label style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>
                            Ticket Tier
                        </label>
                        {isLoadingTiers ? (
                            <div style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6, fontSize: '13px' }}>
                                <Spinner size={14} /> Loading tiers...
                            </div>
                        ) : tiers.length > 0 ? (
                            <select
                                value={selectedTierId}
                                onChange={(e) => setSelectedTierId(e.target.value)}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    background: 'rgba(30, 35, 45, 0.95)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                            >
                                {tiers.map((tier) => (
                                    <option key={tier.id} value={tier.id}>
                                        {tier.display_name} {tier.price ? `(${tier.currency || ''} ${tier.price})` : '(Free)'}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p style={{ fontSize: '13px', color: 'var(--color-interface-error)', margin: 0 }}>
                                No ticket tiers found for this event.
                            </p>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>
                            Quantity
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            style={{
                                padding: '10px 14px',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#fff',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>
            </form>
        </Modal>
    );
}
