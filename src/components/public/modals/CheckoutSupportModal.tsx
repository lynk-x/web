"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createSupportRepository } from '@/lib/repositories';
import { useAuth } from '@/context/AuthContext';

interface CheckoutSupportModalProps {
    isOpen: boolean;
    onClose: () => void;
    checkoutId?: string | null;
    eventName?: string;
    phone?: string;
    paymentError?: string;
}

/**
 * Support modal displayed when a user encounters a payment error during checkout.
 *
 * Automatically pre-populates transaction metadata (order reference, event name,
 * error text) and submits a high-priority ticket via `createSupportRepository`.
 * Also includes a direct `mailto:` fallback.
 */
export function CheckoutSupportModal({
    isOpen,
    onClose,
    checkoutId,
    eventName,
    phone,
    paymentError,
}: CheckoutSupportModalProps) {
    const supabase = createClient();
    const { user } = useAuth();

    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [userNote, setUserNote] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [ticketRef, setTicketRef] = useState('');

    useEffect(() => {
        if (user) {
            setEmail(user.email || '');
            setFullName(user.user_metadata?.full_name || '');
        }
    }, [user]);

    if (!isOpen) return null;

    const defaultSubject = `Checkout Payment Assistance: ${eventName || 'Event Purchase'}`;
    const formattedErrorContext = `Order Ref: ${checkoutId || 'N/A'}\nEvent: ${eventName || 'N/A'}\nPhone: ${phone || 'N/A'}\nError Details: ${paymentError || 'Unspecified payment failure'}`;

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('sending');

        try {
            const supportRepo = createSupportRepository(supabase);
            const fullMessage = `${userNote ? `User Note:\n${userNote}\n\n` : ''}--- System Context ---\n${formattedErrorContext}`;

            const { data, error } = await supportRepo.createTicket({
                user_id: user?.id,
                email: email.trim(),
                full_name: fullName.trim() || undefined,
                subject: defaultSubject,
                message: fullMessage,
                priority: 'urgent',
            });

            if (error || !data) {
                console.error('[CheckoutSupportModal] Error creating ticket:', error);
                setStatus('error');
            } else {
                setTicketRef(data.reference);
                setStatus('sent');
            }
        } catch (err) {
            console.error('[CheckoutSupportModal] Uncaught error:', err);
            setStatus('error');
        }
    };

    const mailtoSubject = encodeURIComponent(defaultSubject);
    const mailtoBody = encodeURIComponent(`${userNote ? `Note: ${userNote}\n\n` : ''}${formattedErrorContext}`);
    const mailtoUrl = `mailto:support@lynk-x.com?subject=${mailtoSubject}&body=${mailtoBody}`;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            padding: '16px',
        }}>
            <div style={{
                background: '#121318',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                maxWidth: '500px',
                width: '100%',
                padding: '24px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                color: '#fff',
                position: 'relative',
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '20px',
                        cursor: 'pointer',
                        lineHeight: 1,
                    }}
                >
                    ✕
                </button>

                {status === 'sent' ? (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'rgba(34, 197, 94, 0.15)',
                            color: 'var(--color-interface-success, #22c55e)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Support Ticket Created!</h3>
                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: 1.5, marginBottom: '16px' }}>
                            Reference: <strong style={{ color: 'var(--color-brand-primary, #20f928)' }}>#{ticketRef}</strong><br />
                            Our payment resolution team will review your order details and contact you at <strong>{email}</strong> shortly.
                        </p>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '8px',
                                background: 'var(--color-brand-primary, #20f928)',
                                color: '#000',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            Back to Checkout
                        </button>
                    </div>
                ) : (
                    <>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Need Payment Assistance?</h3>
                        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', marginBottom: '20px' }}>
                            Submit a high-priority ticket with your transaction context attached so our support agents can verify your payment instantly.
                        </p>

                        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {status === 'error' && (
                                <div style={{
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: 'var(--color-interface-error, #ef4444)',
                                    fontSize: '13px',
                                }}>
                                    Could not submit support ticket. You can try submitting again or use the email link below.
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your contact email"
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        color: '#fff',
                                        fontSize: '14px',
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Additional Note (Optional)</label>
                                <textarea
                                    rows={3}
                                    value={userNote}
                                    onChange={(e) => setUserNote(e.target.value)}
                                    placeholder="E.g., M-Pesa debited Ksh 1,500 but order timed out..."
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        color: '#fff',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            <div style={{
                                padding: '12px',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px dashed rgba(255, 255, 255, 0.12)',
                                fontSize: '12px',
                                color: 'rgba(255, 255, 255, 0.5)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                            }}>
                                <span><strong>Attached Context:</strong></span>
                                {checkoutId && <span>• Order Reference: {checkoutId}</span>}
                                {eventName && <span>• Event: {eventName}</span>}
                                {paymentError && <span>• Error: {paymentError}</span>}
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'sending' || !email.trim()}
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    background: 'var(--color-brand-primary, #20f928)',
                                    color: '#000',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    border: 'none',
                                    cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                                    opacity: status === 'sending' ? 0.7 : 1,
                                }}
                            >
                                {status === 'sending' ? 'Submitting Ticket...' : 'Submit Support Ticket'}
                            </button>
                        </form>

                        <div style={{ marginTop: '16px', textAlign: 'center', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <a
                                href={mailtoUrl}
                                style={{
                                    fontSize: '13px',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    textDecoration: 'underline',
                                }}
                            >
                                Or send directly via Email &rarr;
                            </a>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
