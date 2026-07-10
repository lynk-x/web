"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import styles from './CheckoutView.module.css';
import Skeleton from './Skeleton';
import CheckoutErrorView from './CheckoutErrorView';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/components/ui/Toast';
import { validateKenyanPhone, normalizeToE164 } from '@/utils/phone';
import CountryPhoneSelect, { DialCodeCountry } from '@/components/shared/CountryPhoneSelect';

/** Thrown only when the mpesa-stk-push invocation fails at the transport level (never got a response), not for business-logic rejections the function itself returns. */
class FunctionTransportError extends Error {}

/**
 * CheckoutView — Ticket purchase flow with mandatory phone OTP verification.
 * A single signInWithOtp()/verifyOtp() pair doubles as account creation for
 * first-time buyers and login for returning ones, so tickets always attach
 * to one durable identity instead of a fresh anonymous user per checkout.
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
    const [paymentMethod, setPaymentMethod] = useState<string>('mpesa');
    const [availableProviders, setAvailableProviders] = useState<Array<{
        provider_name: string;
        display_name: string;
        logo_url?: string;
        fee_percent: number;
        base_fee_usd: number;
    }>>([]);

    // Manual confirmation state
    const [manualConfirming, setManualConfirming] = useState(false);

    // Set when the realtime payment-status channel drops mid-wait — the payment
    // may still complete server-side, so this nudges toward manual confirmation
    // rather than treating it as a failure.
    const [realtimeDisrupted, setRealtimeDisrupted] = useState(false);

    // Reservation state — set once tickets are locked, before payment is initiated
    const [reservationExpiresAt, setReservationExpiresAt] = useState<Date | null>(null);
    const [reservationSecondsLeft, setReservationSecondsLeft] = useState(0);

    // Contact form state
    const [formData, setFormData] = useState({
        email: '', phone: '', otpCode: '', mpesaNumber: ''
    });
    const [formErrors, setFormErrors] = useState({
        email: '', phone: '', otpCode: '', mpesaNumber: ''
    });
    // Dial-code country for the contact phone field only — the M-Pesa payment
    // phone field stays a single Kenya-only input, deliberately not linked to
    // this (payment phone and the ticket-linking/contact phone must stay
    // independent, so paying with someone else's M-Pesa number never affects
    // whose account the tickets are findable under).
    const [contactPhoneCountry, setContactPhoneCountry] = useState<DialCodeCountry>({
        code: 'KE', display_name: 'Kenya', phone_prefix: '+254', phone_digits: 9,
    });

    // ── Phone OTP verification state ──────────────────────────────────────────
    // Every checkout now verifies the contact phone via OTP before payment —
    // this replaces the old silent signInAnonymously() call. A single
    // signInWithOtp() covers both new and returning phone numbers (same as the
    // PWA's login), so this doubles as real account creation for first-time
    // guests, and correctly resumes the existing account for returning ones —
    // fixing the old bug where every guest checkout minted a brand-new
    // anonymous identity even if the phone number had purchased before.
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpSending, setOtpSending] = useState(false);
    const [otpVerifying, setOtpVerifying] = useState(false);
    const [otpResendCooldown, setOtpResendCooldown] = useState(0);
    const [otpPhone, setOtpPhone] = useState<string | null>(null);

    // Promo state
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<{
        code: string; discount: number; promoId: string; type: string; value: number;
    } | null>(null);
    const [promoError, setPromoError] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);

    // Derived totals
    const subtotal = getCartTotal();
    const discountAmount = appliedPromo?.discount || 0;
    const total = Math.max(0, subtotal - discountAmount);

    const currency = items[0]?.currency || 'KES';

    // ── Init: restore payment state + pre-fill from session + read service fee ─
    useEffect(() => {
        const init = async () => {
            try {
                // 0. Restore pending payment state from sessionStorage (survives refresh).
                // Only the checkoutId is persisted — phone numbers are not stored to
                // avoid XSS-readable PII in sessionStorage.
                const saved = sessionStorage.getItem('lynk-x-payment');
                if (saved) {
                    const { checkoutId } = JSON.parse(saved);
                    if (checkoutId) {
                        setCurrentCheckoutId(checkoutId);
                        setPaymentStatus('waiting');
                        setIsSubmitting(true);
                    }
                }

                // 1. Service fee fetch removed as we use a flat 5% commission included in the price


                // 2. Pre-fill contact form logic removed to keep checkout fully disconnected from active auth session.
                // 3. Fetch available payment providers based on event currency
                const { data: providers } = await supabase.schema('api').rpc('get_available_payment_providers', {
                    p_currency: currency
                });
                if (providers && providers.length > 0) {
                    setAvailableProviders(providers);
                    // Default to first available, but prefer mpesa if it exists
                    const hasMpesa = (providers as any[]).some(p => p.provider_name === 'mpesa');
                    setPaymentMethod(hasMpesa ? 'mpesa' : providers[0].provider_name);
                }

            } catch (err) {
                console.error('Checkout init error:', err);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [supabase, currency]);

    // ── Realtime Listener for M-Pesa Completion ──────────────────────────────
    useEffect(() => {
        if (!currentCheckoutId || paymentStatus !== 'waiting') return;


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
                    schema: 'finance',
                    table: 'transactions',
                    filter: `provider_ref=eq.${currentCheckoutId}`
                },
                (payload) => {
                    const newStatus = payload.new.status;

                    if (newStatus === 'completed') {
                        clearTimeout(timeoutId);
                        sessionStorage.removeItem('lynk-x-payment');
                        setPaymentStatus('completed');

                        const itemCountAtCompletion = items.length;
                        const firstEventId = items[0]?.eventId || '';
                        const firstEventCreatedAtParam = items[0]?.eventCreatedAt
                            ? `&event_created_at=${encodeURIComponent(items[0].eventCreatedAt)}`
                            : '';
                        clearCart();
                        // Use the M-Pesa checkout request ID as the order reference so
                        // support teams can look it up in the transactions table.
                        router.push(`/checkout/confirmation?order_ref=${encodeURIComponent(currentCheckoutId)}&items=${itemCountAtCompletion}&event_id=${encodeURIComponent(firstEventId)}${firstEventCreatedAtParam}`);
                    } else if (newStatus === 'failed' || newStatus === 'cancelled') {
                        clearTimeout(timeoutId);
                        sessionStorage.removeItem('lynk-x-payment');
                        setPaymentStatus('failed');
                        setPaymentError('Payment was not completed. Please try again or use a different number.');
                        setIsSubmitting(false);
                    }
                }
            )
            .subscribe((status) => {
                // If the realtime socket drops mid-wait, the payment can still succeed
                // server-side — we just won't hear about it automatically anymore. Nudge
                // the user toward the manual "I've completed payment" button rather than
                // leaving them staring at a spinner with no signal anything's wrong.
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    setRealtimeDisrupted(true);
                } else if (status === 'SUBSCRIBED') {
                    setRealtimeDisrupted(false);
                }
            });

        return () => {
            clearTimeout(timeoutId);
            supabase.removeChannel(channel);
        };
    }, [currentCheckoutId, paymentStatus, supabase, router, items.length, clearCart]);

    // ── Reservation countdown ─────────────────────────────────────────────────
    useEffect(() => {
        if (!reservationExpiresAt) return;
        const tick = () => {
            const secs = Math.max(0, Math.floor((reservationExpiresAt.getTime() - Date.now()) / 1000));
            setReservationSecondsLeft(secs);
            if (secs === 0) setReservationExpiresAt(null);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [reservationExpiresAt]);

    // ── OTP resend cooldown ────────────────────────────────────────────────────
    useEffect(() => {
        if (otpResendCooldown <= 0) return;
        const id = setInterval(() => {
            setOtpResendCooldown(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(id);
    }, [otpResendCooldown]);

    // ── Real promo code lookup ────────────────────────────────────────────────
    const handleApplyPromo = useCallback(async () => {
        const code = promoCode.trim().toUpperCase();
        if (!code) return;

        setPromoLoading(true);
        setPromoError('');

        try {
            const { data: promo, error } = await supabase
                .schema('api')
                .from('v1_promo_codes')
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
                discount = subtotal;
            } else if (promo.type === 'percent') {
                discount = (subtotal * promo.value) / 100;
            } else {
                // 'fixed'
                discount = Math.min(promo.value, subtotal);
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
        const errs = { email: '', phone: '', otpCode: '', mpesaNumber: '' };
        let ok = true;

        // Phone Number is required and must match the selected country's digit count
        if (!formData.phone.trim() || !normalizeToE164(formData.phone, contactPhoneCountry.phone_prefix, contactPhoneCountry.phone_digits ?? undefined)) {
            errs.phone = 'Please enter a valid phone number'; ok = false;
        }

        // Email Address is now optional, but if entered, must be valid
        if (formData.email.trim() && !/^\S+@\S+\.\S+$/.test(formData.email)) {
            errs.email = 'Please enter a valid email address'; ok = false;
        }

        if (total > 0 && paymentMethod === 'mpesa' && !validateKenyanPhone(formData.mpesaNumber)) {
            errs.mpesaNumber = 'Valid M-Pesa number required (e.g. 0712345678)'; ok = false;
        }

        setFormErrors(errs);
        return ok;
    };

    // ── OTP: send code to the contact phone ───────────────────────────────────
    const handleSendOtp = async () => {
        const normalizedPhone = normalizeToE164(formData.phone, contactPhoneCountry.phone_prefix, contactPhoneCountry.phone_digits ?? undefined);
        if (!normalizedPhone) {
            setFormErrors(prev => ({ ...prev, phone: 'Please enter a valid phone number' }));
            return;
        }
        if (formData.email.trim() && !/^\S+@\S+\.\S+$/.test(formData.email)) {
            setFormErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
            return;
        }

        setOtpSending(true);
        setPaymentError('');
        try {
            const { error } = await supabase.auth.signInWithOtp({
                phone: normalizedPhone,
            });
            if (error) throw error;

            setOtpPhone(normalizedPhone);
            setOtpSent(true);
            setOtpVerified(false);
            setOtpResendCooldown(60);
        } catch (err) {
            setPaymentError(getErrorMessage(err) || 'Failed to send verification code. Please try again.');
        } finally {
            setOtpSending(false);
        }
    };

    // ── OTP: verify the entered code ──────────────────────────────────────────
    const handleVerifyOtp = async () => {
        const code = formData.otpCode.trim();
        if (!code) {
            setFormErrors(prev => ({ ...prev, otpCode: 'Please enter the code we sent you' }));
            return;
        }
        if (!otpPhone) return;

        setOtpVerifying(true);
        setPaymentError('');
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                phone: otpPhone,
                token: code,
                type: 'sms',
            });
            if (error || !data.user) throw error || new Error('Verification failed');

            // Bonus: if the user supplied an email, attach it to their profile now
            // that they have a real (non-anonymous) session. Non-blocking — the
            // ticket purchase must not fail just because this update fails.
            if (formData.email.trim()) {
                try {
                    await supabase.schema('api').from('v1_profiles').update({
                        email: formData.email.toLowerCase().trim(),
                    }).eq('id', data.user.id);
                } catch (profileErr) {
                    console.warn('Profile email update failed (non-blocking):', profileErr);
                }
            }

            setOtpVerified(true);
            setFormErrors(prev => ({ ...prev, otpCode: '', phone: '' }));
        } catch (err) {
            setFormErrors(prev => ({ ...prev, otpCode: getErrorMessage(err) || 'Invalid or expired code' }));
        } finally {
            setOtpVerifying(false);
        }
    };

    // ── Payment handler (requires phone OTP verification first) ──────────────
    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        if (!otpVerified) {
            setFormErrors(prev => ({ ...prev, phone: 'Please verify your phone number to continue' }));
            document.getElementById('checkout-phone-field')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setPaymentError('');
        setIsSubmitting(true);

        try {
            // OTP verification (handleVerifyOtp) already established the session
            // — either a resumed existing account for a returning phone number, or
            // a brand-new one provisioned by the on_auth_user_created trigger.
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Your session expired. Please verify your phone number again.');

            // Step 1.5: Reserve all cart items before initiating payment.
            // lock_tickets_for_checkout is atomic per tier — run sequentially so we
            // can roll back any already-acquired reservations if a later tier fails
            // (e.g. it sold out mid-checkout), instead of leaving them locked against
            // the same user until the 2-minute cron sweep reclaims them.
            const reservations: Array<{ tierId: string; reservationId: string }> = [];
            for (const item of items) {
                const { data: resId, error: reserveError } = await supabase.schema('api').rpc('lock_tickets_for_checkout', {
                    p_tier_id: item.tierId,
                    p_quantity: item.quantity,
                });
                if (reserveError) {
                    await Promise.all(reservations.map(r =>
                        supabase.schema('api').rpc('release_ticket_reservation', { p_reservation_id: r.reservationId })
                    ));
                    throw new Error(reserveError.message || `Failed to reserve tickets for "${item.ticketType}". They may have just sold out.`);
                }
                reservations.push({ tierId: item.tierId, reservationId: resId as string });
            }

            // Show the 15-minute countdown from this point forward.
            setReservationExpiresAt(new Date(Date.now() + 15 * 60 * 1000));

            // Step 2: Handle zero-cost checkout vs STK Push
            if (total === 0) {
                const { data: result, error: purchaseError } = await supabase.schema('api').rpc('bulk_purchase_tickets', {
                    p_items: items.map(i => ({
                        event_id: i.eventId,
                        tier_id: i.tierId,
                        quantity: i.quantity,
                        reservation_id: reservations.find(r => r.tierId === i.tierId)?.reservationId ?? null,
                        promo_code: appliedPromo?.code || null,
                    })),
                    p_provider: 'in-app',
                    p_provider_ref: 'FREE-' + Date.now()
                });

                if (purchaseError) {
                    throw new Error(purchaseError.message || 'Failed to complete free checkout');
                }

                // Success!
                clearCart();
                const eventCreatedAtParam = items[0]?.eventCreatedAt
                    ? `&event_created_at=${encodeURIComponent(items[0].eventCreatedAt)}`
                    : '';
                router.push(`/checkout/confirmation?order_ref=${encodeURIComponent(result.ticket_ids?.[0] || 'FREE')}&items=${items.length}&event_id=${encodeURIComponent(items[0]?.eventId || '')}${eventCreatedAtParam}`);
                return;
            }

            // Step 3: Initiate real STK Push via Edge Function (or other provider logic)
            if (paymentMethod === 'mpesa') {
                const { data, error: funcError } = await supabase.functions.invoke('mpesa-stk-push', {
                    body: {
                        phone: formData.mpesaNumber,
                        amount: total,
                        currency: currency,
                        metadata: {
                            user_id: user.id,
                            email: formData.email.trim() || null,
                            phone: otpPhone,
                            items: items.map(i => ({
                                event_id: i.eventId,
                                tier_id: i.tierId,
                                quantity: i.quantity,
                                reservation_id: reservations.find(r => r.tierId === i.tierId)?.reservationId ?? null,
                                promo_code: appliedPromo?.code || null,
                            })),
                        }
                    }
                });

                if (funcError) {

                    const { data: pending } = await supabase.schema('api').rpc('check_pending_ticket_payment', {
                        p_user_id: user.id,
                        p_window_minutes: 5,
                    });

                    if (pending?.provider_ref) {
                        setCurrentCheckoutId(pending.provider_ref);
                        setPaymentStatus('waiting');
                        setRealtimeDisrupted(false);
                        sessionStorage.setItem('lynk-x-payment', JSON.stringify({
                            checkoutId: pending.provider_ref,
                        }));
                        return;
                    }

                    throw new FunctionTransportError(funcError.message || 'Failed to reach payment service');
                }
                if (!data?.success) {
                    throw new Error(data?.error || 'Failed to initiate STK push');
                }

                setCurrentCheckoutId(data.checkoutRequestId);
                setPaymentStatus('waiting');
                setRealtimeDisrupted(false);
                sessionStorage.setItem('lynk-x-payment', JSON.stringify({
                    checkoutId: data.checkoutRequestId,
                }));
            } else {
                // Fallback for other providers (e.g. Flutterwave redirect)
                throw new Error(`Payment method "${paymentMethod}" is not yet fully integrated for direct checkout. Please use M-Pesa.`);
            }

        } catch (err: unknown) {
            console.error('Payment error:', err);
            let errorMessage = getErrorMessage(err) || 'Payment failed to initiate.';


            if (err instanceof FunctionTransportError) {
                if (errorMessage.toLowerCase().includes('function') && errorMessage.toLowerCase().includes('not found')) {
                    errorMessage = 'Payment service is not configured. Please contact support.';
                } else {
                    errorMessage = 'Unable to reach the payment service. Please check your internet connection and try again.';
                }
            }

            setPaymentError(errorMessage);
            setIsSubmitting(false);
        }
    };

    const handleManualConfirm = async () => {
        if (!currentCheckoutId) return;
        setManualConfirming(true);
        setPaymentError('');

        try {
            const { data, error } = await supabase
                .schema('api')
                .from('v1_transactions')
                .select('status, reason')
                .eq('provider_ref', currentCheckoutId)
                .eq('category', 'outgoing')
                .single();

            if (error || !data) {
                setPaymentError('Payment not found. Please wait a moment and try again, or contact support if you were debited.');
                return;
            }

            if (data.status === 'completed' && data.reason === 'ticket_sale') {
                sessionStorage.removeItem('lynk-x-payment');
                setPaymentStatus('completed');
                const itemCountAtCompletion = items.length;
                const firstEventId = items[0]?.eventId || '';
                const firstEventCreatedAtParam = items[0]?.eventCreatedAt
                    ? `&event_created_at=${encodeURIComponent(items[0].eventCreatedAt)}`
                    : '';
                clearCart();
                router.push(`/checkout/confirmation?order_ref=${encodeURIComponent(currentCheckoutId)}&items=${itemCountAtCompletion}&event_id=${encodeURIComponent(firstEventId)}${firstEventCreatedAtParam}`);
            } else if (data.status === 'pending') {
                setPaymentError('Payment is still processing. Please wait for the confirmation SMS from M-Pesa and try again shortly.');
            } else if (data.status === 'failed' || data.status === 'cancelled') {
                sessionStorage.removeItem('lynk-x-payment');
                setPaymentStatus('failed');
                setPaymentError(`Payment was ${data.status}. Please try again or use a different payment number.`);
                setIsSubmitting(false);
            }
        } catch {
            setPaymentError('Unable to verify payment status. Please try again or contact support.');
        } finally {
            setManualConfirming(false);
        }
    };


    if (paymentStatus === 'completed') {
        return (
            <div className={styles.container}>
                <main className={styles.emptyStateContainer}>
                    <Skeleton width="48px" height="48px" style={{ borderRadius: '50%', margin: '0 auto 16px' }} />
                    <p className={styles.emptyStateText}>Payment confirmed — redirecting…</p>
                </main>
            </div>
        );
    }

    // ── Empty cart ────────────────────────────────────────────────────────────
    if (items.length === 0 && !isLoading) {
        return (
            <CheckoutErrorView
                title="Your cart is empty"
                description="Looks like you haven't added any tickets yet."
                actionLabel="Browse Events"
                actionHref="/"
            />
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
                            {reservationExpiresAt && reservationSecondsLeft > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: reservationSecondsLeft < 120 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${reservationSecondsLeft < 120 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: reservationSecondsLeft < 120 ? '#ef4444' : '#22c55e' }}>
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                        <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    <span style={{ fontSize: 13, color: reservationSecondsLeft < 120 ? '#ef4444' : 'rgba(255,255,255,0.7)' }}>
                                        Tickets reserved — {Math.floor(reservationSecondsLeft / 60)}:{String(reservationSecondsLeft % 60).padStart(2, '0')} remaining
                                    </span>
                                </div>
                            )}

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
                                Your tickets will be linked to this email and phone number. Please ensure they are correct.
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
                                        <label className={styles.label}>Country</label>
                                        <CountryPhoneSelect
                                            value={contactPhoneCountry.code}
                                            onChange={setContactPhoneCountry}
                                            className={styles.select}
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Email Address</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={`${styles.input} ${formErrors.email ? styles.inputError : ''}`} placeholder="john@example.com" />
                                        {formErrors.email && <span className={styles.errorText}>{formErrors.email}</span>}
                                    </div>

                                    <div className={styles.formGroup} id="checkout-phone-field">
                                        <label className={styles.label}>Phone Number</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={(e) => {
                                                    handleInputChange(e);
                                                    // Editing the phone after sending/verifying invalidates
                                                    // the code that was sent — force a fresh send.
                                                    if (otpSent || otpVerified) {
                                                        setOtpSent(false);
                                                        setOtpVerified(false);
                                                        setOtpPhone(null);
                                                        setFormData(prev => ({ ...prev, otpCode: '' }));
                                                    }
                                                }}
                                                className={`${styles.input} ${formErrors.phone ? styles.inputError : ''}`}
                                                placeholder="700 000 000"
                                                autoFocus
                                                disabled={otpVerified}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleSendOtp}
                                                disabled={otpSending || otpVerified || otpResendCooldown > 0}
                                                className={styles.applyBtn}
                                                style={{ whiteSpace: 'nowrap' }}
                                            >
                                                {otpVerified
                                                    ? 'Verified ✓'
                                                    : otpSending
                                                        ? 'Sending…'
                                                        : otpResendCooldown > 0
                                                            ? `Resend (${otpResendCooldown}s)`
                                                            : otpSent
                                                                ? 'Resend OTP'
                                                                : 'Send OTP'}
                                            </button>
                                        </div>
                                        {formErrors.phone && <span className={styles.errorText}>{formErrors.phone}</span>}
                                    </div>

                                    {otpSent && !otpVerified && (
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Verification Code</label>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    name="otpCode"
                                                    value={formData.otpCode}
                                                    onChange={handleInputChange}
                                                    className={`${styles.input} ${formErrors.otpCode ? styles.inputError : ''}`}
                                                    placeholder="Enter code"
                                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleVerifyOtp())}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleVerifyOtp}
                                                    disabled={otpVerifying || !formData.otpCode.trim()}
                                                    className={styles.applyBtn}
                                                    style={{ whiteSpace: 'nowrap' }}
                                                >
                                                    {otpVerifying ? 'Verifying…' : 'Verify'}
                                                </button>
                                            </div>
                                            {formErrors.otpCode && <span className={styles.errorText}>{formErrors.otpCode}</span>}
                                            <p className={styles.helperText}>* We sent a code to {otpPhone}</p>
                                        </div>
                                    )}



                                </>
                            )}
                        </section>

                        {total > 0 && (
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
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                            >
                                                {availableProviders.length > 0 ? (
                                                    availableProviders.map(p => (
                                                        <option key={p.provider_name} value={p.provider_name}>
                                                            {p.display_name}
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option value="mpesa">M-Pesa</option>
                                                )}
                                            </select>
                                        </div>

                                        {paymentMethod === 'mpesa' && (
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
                                                <p className={styles.helperText}>* An STK push will be sent to your phone</p>
                                            </div>
                                        )}
                                        
                                        {paymentMethod !== 'mpesa' && paymentMethod !== 'in-app' && (
                                            <p className={styles.helperText}>* You will be redirected to complete your payment via {paymentMethod}</p>
                                        )}
                                    </>
                                )}
                            </section>
                        )}

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
                                    {isSubmitting ? 'Processing…' : (
                                        total === 0
                                            ? 'Confirm Reservation'
                                            : `Confirm & Pay ${currency} ${total.toLocaleString()}`
                                    )}
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
                        {realtimeDisrupted && (
                            <p style={{ fontSize: '13px', color: 'var(--color-interface-error)', margin: '0 0 8px', textAlign: 'center' }}>
                                Live status updates were interrupted. If you&apos;ve completed payment on your phone, tap the button below to confirm.
                            </p>
                        )}
                        {paymentError && (
                            <p style={{ fontSize: '13px', color: 'var(--color-interface-error)', margin: '0 0 8px', textAlign: 'center' }}>
                                {paymentError}
                            </p>
                        )}
                        <button
                            className={styles.primaryBtn}
                            disabled={manualConfirming}
                            onClick={handleManualConfirm}
                        >
                            {manualConfirming ? 'Checking...' : "I've completed payment"}
                        </button>
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
