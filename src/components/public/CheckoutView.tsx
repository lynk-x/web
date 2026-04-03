"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import styles from './CheckoutView.module.css';
import Skeleton from './Skeleton';
import { useCart } from '@/context/CartContext';

/**
 * CheckoutView — Guest-first ticket purchase flow.
 */
const CheckoutView: React.FC = () => {
    const { items, getCartTotal, itemCount, removeFromCart, clearCart } = useCart();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'waiting' | 'completed' | 'failed'>('idle');
    const [paymentError, setPaymentError] = useState('');
    const [currentCheckoutId, setCurrentCheckoutId] = useState<string | null>(null);

    // Contact form state
    const [formData, setFormData] = useState({
        fullName: '', email: '', phone: '', mpesaNumber: ''
    });
    const [formErrors, setFormErrors] = useState({
        fullName: '', email: '', phone: '', mpesaNumber: ''
    });

    // Service fee fetched from system_config (per ticket)
    const [baseFeePerTicket, setBaseFeePerTicket] = useState<number>(0);

    // Promo state
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<{
        code: string; discount: number; promoId: string;
    } | null>(null);
    const [promoError, setPromoError] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);

    // Derived totals
    const subtotal = getCartTotal();
    const totalServiceFee = itemCount * baseFeePerTicket;
    const discountAmount = appliedPromo?.discount || 0;
    const total = subtotal + totalServiceFee - discountAmount;
    const currency = items[0]?.currency || 'KES';

    // ── Init: pre-fill from session + read service fee from DB ────────────────
    useEffect(() => {
        const init = async () => {
            try {
                // 1. Read platform base fee from system_config
                const { data: feeConfig } = await supabase
                    .from('system_config')
                    .select('value')
                    .eq('key', 'platform_base_fee_usd')
                    .maybeSingle();

                if (feeConfig?.value) {
                    setBaseFeePerTicket(parseFloat(String(feeConfig.value)));
                }

                // 2. Pre-fill contact form if user is already signed in
                const { data: { user } } = await supabase.auth.getUser();
                if (user && !user.is_anonymous) {
                    const { data: profile } = await supabase
                        .from('user_profile')
                        .select('display_name, email, phone_number')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (profile) {
                        setFormData(prev => ({
                            ...prev,
                            fullName: profile.display_name || '',
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
                        setPaymentStatus('completed');
                        clearCart();
                        const orderRef = 'LX-' + Date.now().toString(36).toUpperCase();
                        router.push(`/checkout/confirmation?order_ref=${orderRef}&items=${items.length}`);
                    } else if (newStatus === 'failed' || newStatus === 'cancelled') {
                        setPaymentStatus('failed');
                        setPaymentError('Payment was not completed. Please try again or use a different number.');
                        setIsSubmitting(false);
                    }
                }
            )
            .subscribe();

        return () => {
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
                .select('id, discount_type, discount_value, max_uses, uses_count, expires_at, is_active')
                .eq('code', code)
                .maybeSingle();

            if (error || !promo) {
                setPromoError('Invalid or unrecognised promo code.');
                setAppliedPromo(null);
                return;
            }
            if (!promo.is_active) {
                setPromoError('This promo code is no longer active.');
                setAppliedPromo(null);
                return;
            }
            if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
                setPromoError('This promo code has expired.');
                setAppliedPromo(null);
                return;
            }
            if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
                setPromoError('This promo code has reached its usage limit.');
                setAppliedPromo(null);
                return;
            }

            const discount = promo.discount_type === 'percentage'
                ? (subtotal * promo.discount_value) / 100
                : Math.min(promo.discount_value, subtotal);

            setAppliedPromo({ code, discount, promoId: promo.id });
            setPromoCode('');
        } catch {
            setPromoError('Failed to validate promo code. Please try again.');
        } finally {
            setPromoLoading(false);
        }
    }, [promoCode, subtotal, supabase]);

    const handleRemovePromo = () => setAppliedPromo(null);

    // ── Form helpers ──────────────────────────────────────────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name as keyof typeof formErrors]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = (): boolean => {
        const errs = { fullName: '', email: '', phone: '', mpesaNumber: '' };
        let ok = true;

        if (!formData.fullName.trim()) { errs.fullName = 'Full name is required'; ok = false; }
        if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email)) {
            errs.email = 'Valid email address is required'; ok = false;
        }
        if (!formData.phone.trim() || !/^\+?[0-9\s]{6,15}$/.test(formData.phone)) {
            errs.phone = 'Valid phone number is required'; ok = false;
        }
        const mpesaClean = formData.mpesaNumber.replace(/\s+/g, '');
        if (!mpesaClean || !/^(?:0|\+?254)[17]\d{8}$/.test(mpesaClean)) {
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
                        display_name: formData.fullName.trim(),
                        email: formData.email.toLowerCase().trim(),
                        phone_number: formData.phone.trim(),
                    }, { onConflict: 'id' });
                }
            }
            if (!user) throw new Error('Could not establish session');

            // Step 2: Initiate real STK Push via Edge Function
            const { data, error: funcError } = await supabase.functions.invoke('mpesa-stk-push', {
                body: {
                    phone: formData.mpesaNumber,
                    amount: total,
                    currency: currency,
                    metadata: {
                        user_id: user.id,
                        email: formData.email,
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

            // Step 3: Enter waiting state
            setCurrentCheckoutId(data.checkoutRequestId);
            setPaymentStatus('waiting');

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
                                                    <span>{item.eventTitle}</span>
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
                                    {baseFeePerTicket > 0 && (
                                        <div className={styles.summaryItem}>
                                            <span>Service Fee ({itemCount} &times; {currency} {baseFeePerTicket.toLocaleString()})</span>
                                            <span>{currency} {totalServiceFee.toLocaleString()}</span>
                                        </div>
                                    )}

                                    {appliedPromo ? (
                                        <div className={`${styles.summaryItem} ${styles.discount}`}>
                                            <div className={styles.appliedPromoInfo}>
                                                <span>Promo: {appliedPromo.code}</span>
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
                                Your tickets will be linked to this email. No account required.
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
                                        <label className={styles.label}>Full Name</label>
                                        <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className={`${styles.input} ${formErrors.fullName ? styles.inputError : ''}`} placeholder="John Doe" />
                                        {formErrors.fullName && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.fullName}</span>}
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Email Address</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={`${styles.input} ${formErrors.email ? styles.inputError : ''}`} placeholder="john@example.com" />
                                        {formErrors.email && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.email}</span>}
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Phone Number</label>
                                        <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className={`${styles.input} ${formErrors.phone ? styles.inputError : ''}`} placeholder="+254 700 000 000" />
                                        {formErrors.phone && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.phone}</span>}
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
                                        <label className={styles.label}>M-Pesa Number</label>
                                        <input type="tel" name="mpesaNumber" value={formData.mpesaNumber} onChange={handleInputChange} className={`${styles.input} ${formErrors.mpesaNumber ? styles.inputError : ''}`} placeholder="+254 7..." />
                                        {formErrors.mpesaNumber && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.mpesaNumber}</span>}
                                    </div>
                                    <p className={styles.helperText}>* An STK push will be sent to your phone</p>
                                </>
                            )}
                        </section>

                        <div className={styles.footerActions}>
                            {paymentError && (
                                <p style={{ color: 'red', textAlign: 'center', marginBottom: '1rem' }}>{paymentError}</p>
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
            <div className={styles.logoContainer}>
                <Image src="/lynk-x_combined_logo.svg" alt="Lynk-X" width={200} height={60} className={styles.logo} priority />
            </div>
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
