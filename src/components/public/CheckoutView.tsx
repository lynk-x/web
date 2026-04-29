"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import styles from './CheckoutView.module.css';
import Skeleton from './Skeleton';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/components/ui/Toast';
import { validateKenyanPhone } from '@/utils/phone';

/**
 * CheckoutView — Guest-first ticket purchase flow.
 */
const CheckoutView: React.FC = () => {
    const { items, getCartTotal, itemCount, removeFromCart, clearCart } = useCart();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'waiting' | 'completed' | 'failed'>('idle');
    const [paymentError, setPaymentError] = useState('');
    const [currentCheckoutId, setCurrentCheckoutId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'mpesa'>('mpesa');

    // Contact form state
    const [formData, setFormData] = useState({
        email: '', phone: '', mpesaNumber: ''
    });
    const [formErrors, setFormErrors] = useState({
        email: '', phone: '', mpesaNumber: ''
    });

    // Platform commission (5% of subtotal)
    const commissionRate = 0.05;


    // Promo state
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<{
        code: string; discount: number; promoId: string; type: string; value: number;
    } | null>(null);
    const [promoError, setPromoError] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);

    // Derived totals
    const subtotal = getCartTotal();
    const commissionAmount = subtotal * commissionRate;
    const discountAmount = appliedPromo?.discount || 0;
    // Total is subtotal + fee - discount. If free entry, ensure it hits zero.
    const total = Math.max(0, (subtotal + commissionAmount) - discountAmount);

    const currency = items[0]?.currency || 'KES';

    // ── Init: restore payment state + pre-fill from session + read service fee ─
    useEffect(() => {
        const init = async () => {
            try {
                // 0. Restore pending payment state from sessionStorage (survives refresh)
                const saved = sessionStorage.getItem('lynk-x-payment');
                if (saved) {
                    const { checkoutId, phone } = JSON.parse(saved);
                    if (checkoutId) {
                        setCurrentCheckoutId(checkoutId);
                        setPaymentStatus('waiting');
                        setFormData(prev => ({ ...prev, mpesaNumber: phone || prev.mpesaNumber }));
                        setIsSubmitting(true);
                    }
                }

                // 1. Service fee fetch removed as we use a flat 5% commission included in the price


                // 2. Pre-fill contact form if user is already signed in
                const { data: { user } } = await supabase.auth.getUser();
                if (user && !user.is_anonymous) {
                    const { data: profile } = await supabase
                        .from('user_profile')
                        .select('full_name, email, phone_number')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (profile) {
                        setFormData(prev => ({
                            ...prev,
                            email: profile.email || user.email || '',
                            phone: profile.phone_number || '',
                        }));
                    }
                }
            } catch (err) {
                console.error('Checkout init error:', err);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [supabase]);

    // ── Realtime Listener for M-Pesa Completion ──────────────────────────────
    useEffect(() => {
        if (!currentCheckoutId || paymentStatus !== 'waiting') return;

        console.log('[Checkout] Listening for payment completion:', currentCheckoutId);

        // Time-out after 10 minutes — if the Daraja webhook never fires the user
        // would otherwise be stuck on the spinner indefinitely.
        const timeoutId = setTimeout(() => {
            sessionStorage.removeItem('lynk-x-payment');
            setPaymentStatus('failed');
            setPaymentError('Payment confirmation timed out. Check your M-Pesa messages — if you were debited please contact support with your M-Pesa reference.');
            setIsSubmitting(false);
        }, 10 * 60 * 1000);

        const channel = supabase
            .channel(`payment_check_${currentCheckoutId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'transactions',
                    filter: `provider_ref=eq.${currentCheckoutId}`
                },
                (payload) => {
                    const newStatus = payload.new.status;
                    console.log('[Checkout] Transaction status updated:', newStatus);

                    if (newStatus === 'completed') {
                        clearTimeout(timeoutId);
                        sessionStorage.removeItem('lynk-x-payment');
                        setPaymentStatus('completed');
                        clearCart();
                        // Use the M-Pesa checkout request ID as the order reference so
                        // support teams can look it up in the transactions table.
                        router.push(`/checkout/confirmation?order_ref=${encodeURIComponent(currentCheckoutId)}&items=${items.length}&event_id=${encodeURIComponent(items[0]?.eventId || '')}`);
                    } else if (newStatus === 'failed' || newStatus === 'cancelled') {
                        clearTimeout(timeoutId);
                        sessionStorage.removeItem('lynk-x-payment');
                        setPaymentStatus('failed');
                        setPaymentError('Payment was not completed. Please try again or use a different number.');
                        setIsSubmitting(false);
                    }
                }
            )
            .subscribe();

        return () => {
            clearTimeout(timeoutId);
            supabase.removeChannel(channel);
        };
    }, [currentCheckoutId, paymentStatus, supabase, router, items.length, clearCart]);

    // ── Real promo code lookup ────────────────────────────────────────────────
    const handleApplyPromo = useCallback(async () => {
        const code = promoCode.trim().toUpperCase();
        if (!code) return;

        setPromoLoading(true);
        setPromoError('');

        try {
            const { data: promo, error } = await supabase
                .from('promo_codes')
                .select('id, type, value, max_uses, uses_count, valid_from, valid_until, is_active')
                .eq('code', code)
                .maybeSingle();

            if (error || !promo) {
                setPromoError('Promo code not found. Please check the code and try again.');
                setAppliedPromo(null);
                return;
            }
            if (!promo.is_active) {
                setPromoError('This promo code is no longer active.');
                setAppliedPromo(null);
                return;
            }
            const now = new Date();
            if (promo.valid_from && new Date(promo.valid_from) > now) {
                setPromoError('This promo code is not yet active.');
                setAppliedPromo(null);
                return;
            }
            if (promo.valid_until && new Date(promo.valid_until) < now) {
                setPromoError('This promo code has expired.');
                setAppliedPromo(null);
                return;
            }
            if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
                setPromoError('This promo code has reached its usage limit.');
                setAppliedPromo(null);
                return;
            }

            let discount: number;
            if (promo.type === 'free_entry') {
                discount = subtotal + commissionAmount;
            } else if (promo.type === 'percent') {
                discount = ((subtotal + commissionAmount) * promo.value) / 100;
            } else {
                // 'fixed'
                discount = Math.min(promo.value, subtotal + commissionAmount);
            }

            setAppliedPromo({ code, discount, promoId: promo.id, type: promo.type, value: promo.value });
            setPromoCode('');
        } catch {
            setPromoError('Failed to validate promo code. Please try again.');
        } finally {
            setPromoLoading(false);
        }
    }, [promoCode, subtotal, supabase]);

    const handleRemovePromo = () => {
        setAppliedPromo(null);
        showToast('Promo code removed.', 'info');
    };

    // ── Form helpers ──────────────────────────────────────────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name as keyof typeof formErrors]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = (): boolean => {
        const errs = { email: '', phone: '', mpesaNumber: '' };
        let ok = true;

        // Phone Number is required
        if (!formData.phone.trim() || !/^\+?[0-9\s]{6,15}$/.test(formData.phone)) {
            errs.phone = 'Please enter a valid phone number'; ok = false;
        }

        // Email Address is now optional, but if entered, must be valid
        if (formData.email.trim() && !/^\S+@\S+\.\S+$/.test(formData.email)) {
            errs.email = 'Please enter a valid email address'; ok = false;
        }

        if (paymentMethod === 'mpesa' && !validateKenyanPhone(formData.mpesaNumber)) {
            errs.mpesaNumber = 'Valid M-Pesa number required (e.g. 0712345678)'; ok = false;
        }

        setFormErrors(errs);
        return ok;
    };

    // ── Payment handler (guest-first, no auth wall) ───────────────────────────
    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setPaymentError('');
        setIsSubmitting(true);

        try {
            // Step 1: Resolve user session
            let { data: { user } } = await supabase.auth.getUser();
            if (!user || user.is_anonymous) {
                const { data: anonData } = await supabase.auth.signInAnonymously();
                user = anonData.user;
                if (user) {
                    await supabase.from('user_profile').upsert({
                        id: user.id,
                        email: formData.email.trim() ? formData.email.toLowerCase().trim() : null,
                        phone_number: formData.phone.trim(),
                    }, { onConflict: 'id' });
                }
            }
            if (!user) throw new Error('Could not establish session');
            
            // Step 1.5: Reserve tickets (lock inventory) before payment
            // This ensures tickets aren't sold out while the user is paying.
            // Note: We loop through items but since current app usually checks out 1 event at a time,
            // we focus on the first item for the primary reservation.
            const { data: reservationId, error: reserveError } = await supabase.rpc('lock_tickets_for_checkout', {
                p_tier_id: items[0].tierId,
                p_quantity: items[0].quantity
            });

            if (reserveError) {
                throw new Error(reserveError.message || 'Failed to reserve tickets. They might have just sold out.');
            }

            // Step 2: Initiate real STK Push via Edge Function
            const { data, error: funcError } = await supabase.functions.invoke('mpesa-stk-push', {
                body: {
                    phone: formData.mpesaNumber,
                    amount: total,
                    currency: currency,
                    metadata: {
                        user_id: user.id,
                        email: formData.email.trim() || null,
                        phone: formData.phone.trim(),
                        items: items.map(i => ({ event_id: i.eventId, tier_id: i.tierId, quantity: i.quantity, promo_code: appliedPromo?.code || null })),
                        // Webhook fulfillment hints
                        event_id: items[0].eventId,
                        tier_id: items[0].tierId,
                        quantity: items[0].quantity,
                        promo_code: appliedPromo?.code || null
                    }
                }
            });

            if (funcError || !data?.success) {
                throw new Error(funcError?.message || data?.error || 'Failed to initiate STK push');
            }

            // Step 3: Enter waiting state (persist so it survives page refresh)
            setCurrentCheckoutId(data.checkoutRequestId);
            setPaymentStatus('waiting');
            sessionStorage.setItem('lynk-x-payment', JSON.stringify({
                checkoutId: data.checkoutRequestId,
                phone: formData.mpesaNumber,
            }));

        } catch (err: any) {
            console.error('Payment error:', err);
            setPaymentError(err.message || 'Payment failed to initiate.');
            setIsSubmitting(false);
        }
    };

    // ── Empty cart ────────────────────────────────────────────────────────────
    if (items.length === 0 && !isLoading) {
        return (
            <div className={styles.container}>
                <CheckoutHeader />
                <main className={styles.emptyStateContainer}>
                    <h2 className={styles.emptyStateTitle}>Your cart is empty</h2>
                    <p className={styles.emptyStateText}>{"Looks like you haven't added any tickets yet."}</p>
                    <Link href="/" className={styles.payBtn} style={{ maxWidth: 200 }}>Browse Events</Link>
                </main>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <CheckoutHeader />
            <main className={styles.content}>
                <div className={styles.layoutGrid}>

                    {/* ── Order Summary ──────────────────────────────── */}
                    <div className={styles.summaryColumn}>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Order Summary</h2>

                            {isLoading ? (
                                <>
                                    <Skeleton width="100%" height="24px" className={styles.summaryItem} style={{ margin: '8px 0' }} />
                                    <Skeleton width="100%" height="24px" className={styles.summaryItem} style={{ margin: '8px 0' }} />
                                    <Skeleton width="100%" height="40px" className={styles.total} style={{ marginTop: 16 }} />
                                </>
                            ) : (
                                <>
                                    {items.map((item) => (
                                        <div key={item.id} className={styles.cartItem}>
                                            <div className={styles.cartItemInfo}>
                                                <div className={styles.cartItemHeader}>
                                                    <Link href={`/event/${item.eventReference}`} className={styles.eventLink}>
                                                        {item.eventTitle}
                                                    </Link>
                                                    <span>{item.currency} {(item.price * item.quantity).toLocaleString()}</span>
                                                </div>
                                                <div className={styles.cartItemDetails}>
                                                    <span>{item.ticketType} &times; {item.quantity}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className={styles.removeBtn}
                                                title="Remove item"
                                                aria-label={`Remove ${item.eventTitle} from cart`}
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}

                                    <div className={styles.summaryItem}>
                                        <span>Subtotal</span>
                                        <span>{currency} {subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <span>Service Fee</span>
                                        <span className={styles.feeAmount}>{currency} {commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>


                                    {appliedPromo ? (
                                        <div className={`${styles.summaryItem} ${styles.discount}`}>
                                            <div className={styles.appliedPromoInfo}>
                                                <span>
                                                    Promo: {appliedPromo.code} 
                                                    {appliedPromo.type === 'percent' && ` (-${appliedPromo.value}%)`}
                                                    {appliedPromo.type === 'fixed' && ` (-${currency} ${appliedPromo.value})`}
                                                    {appliedPromo.type === 'free_entry' && ` (Free)`}
                                                </span>
                                                <button onClick={handleRemovePromo} className={styles.removePromoBtn}>Remove</button>
                                            </div>
                                            <span>-{currency} {appliedPromo.discount.toLocaleString()}</span>
                                        </div>
                                    ) : (
                                        <div className={styles.promoContainer}>
                                            <div className={styles.promoInputWrapper}>
                                                <input
                                                    type="text"
                                                    className={styles.promoInput}
                                                    placeholder="Promo code"
                                                    value={promoCode}
                                                    onChange={(e) => setPromoCode(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                                                    disabled={promoLoading}
                                                />
                                                <button
                                                    onClick={handleApplyPromo}
                                                    className={styles.applyBtn}
                                                    disabled={promoLoading || !promoCode.trim()}
                                                >
                                                    {promoLoading ? '…' : 'Apply'}
                                                </button>
                                            </div>
                                            {promoError && <p className={styles.promoError}>{promoError}</p>}
                                        </div>
                                    )}

                                    <div className={styles.total}>
                                        <span>Total</span>
                                        <span>{currency} {total.toLocaleString()}</span>
                                    </div>
                                </>
                            )}
                        </section>
                    </div>

                    {/* ── Contact + Payment Forms ─────────────────────── */}
                    <div className={styles.formsColumn}>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Contact Information</h2>
                            <p style={{ fontSize: '13px', opacity: 0.6, marginBottom: '16px' }}>
                                Your tickets will be linked to this phone number. Please ensure its the correct one.
                            </p>
                            {isLoading ? (
                                <>
                                    <Skeleton width="100%" height="56px" style={{ marginBottom: 16 }} />
                                    <Skeleton width="100%" height="56px" style={{ marginBottom: 16 }} />
                                    <Skeleton width="100%" height="56px" />
                                </>
                            ) : (
                                <>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Phone Number</label>
                                        <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className={`${styles.input} ${formErrors.phone ? styles.inputError : ''}`} placeholder="+254 700 000 000" autoFocus />
                                        {formErrors.phone && <span className={styles.errorText}>{formErrors.phone}</span>}
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Email Address(Optional)</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={`${styles.input} ${formErrors.email ? styles.inputError : ''}`} placeholder="john@example.com" />
                                        {formErrors.email && <span className={styles.errorText}>{formErrors.email}</span>}
                                    </div>

                                </>
                            )}
                        </section>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Payment</h2>
                            {isLoading ? (
                                <Skeleton width="100%" height="56px" style={{ marginBottom: 16 }} />
                            ) : (
                                <>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Payment Method</label>
                                        <select 
                                            className={styles.select}
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value as 'mpesa')}
                                        >
                                            <option value="mpesa">M-Pesa</option>
                                        </select>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>M-Pesa Number</label>
                                        <input
                                            type="tel"
                                            name="mpesaNumber"
                                            value={formData.mpesaNumber}
                                            onChange={handleInputChange}
                                            onBlur={() => {
                                                if (formData.mpesaNumber && !validateKenyanPhone(formData.mpesaNumber)) {
                                                    setFormErrors(prev => ({ ...prev, mpesaNumber: 'Valid M-Pesa number required (e.g. 0712345678)' }));
                                                } else {
                                                    setFormErrors(prev => ({ ...prev, mpesaNumber: '' }));
                                                }
                                            }}
                                            className={`${styles.input} ${formErrors.mpesaNumber ? styles.inputError : ''}`}
                                            placeholder="+254 7..."
                                        />
                                        {formErrors.mpesaNumber && <span className={styles.errorText}>{formErrors.mpesaNumber}</span>}
                                    </div>
                                    <p className={styles.helperText}>* An STK push will be sent to your phone</p>
                                </>
                            )}
                        </section>

                        <div className={styles.footerActions}>
                            {paymentError && (
                                <div style={{ marginBottom: '1rem', padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                    <p style={{ color: 'var(--color-interface-error)', fontSize: '14px', margin: '0 0 8px' }}>{paymentError}</p>
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => { setPaymentError(''); setPaymentStatus('idle'); setIsSubmitting(false); }}
                                            style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.5)', background: 'transparent', color: 'var(--color-interface-error)', cursor: 'pointer' }}
                                        >
                                            Try Again
                                        </button>
                                        <a
                                            href="mailto:support@lynk-x.com"
                                            style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}
                                        >
                                            Contact Support
                                        </a>
                                    </div>
                                </div>
                            )}
                            {isLoading ? (
                                <Skeleton width="100%" height="56px" borderRadius="8px" />
                            ) : (
                                <button
                                    onClick={handlePayment}
                                    className={styles.payBtn}
                                    disabled={isSubmitting || items.length === 0}
                                >
                                    {isSubmitting ? 'Processing…' : `Confirm & Pay ${currency} ${total.toLocaleString()}`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Waiting for Payment Overlay ─────────────────────────── */}
            {paymentStatus === 'waiting' && (
                <div className={styles.overlay}>
                    <div className={styles.modal}>
                        <div className={styles.spinner}></div>
                        <h2 className={styles.waitingTitle}>Check your phone</h2>
                        <p className={styles.waitingText}>
                            A prompt has been sent to <strong>{formData.mpesaNumber}</strong>.<br />
                            Please enter your M-Pesa PIN to complete the purchase.
                        </p>
                        <p className={styles.helperText}>Waiting for confirmation...</p>
                        <button
                            className={styles.cancelBtn}
                            onClick={() => {
                                sessionStorage.removeItem('lynk-x-payment');
                                setPaymentStatus('idle');
                                setIsSubmitting(false);
                            }}
                        >
                            Cancel Payment
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

/** Shared checkout page header — avoids duplication between empty-cart and full views. */
function CheckoutHeader() {
    return (
        <header className={styles.header}>
            <Link href="/" className={styles.backBtn}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </Link>
            <Link href="/" className={styles.logoContainer}>
                <Image src="/lynk-x_combined_logo.svg" alt="Lynk-X" width={200} height={60} className={styles.logo} priority />
            </Link>
            <div className={styles.securityIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </header>
    );
}

export default CheckoutView;
