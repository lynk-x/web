"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from '@/components/public/CheckoutView.module.css';
import Skeleton from '@/components/public/Skeleton';
import Spinner from '@/components/shared/Spinner';
import { useToast } from '@/components/ui/Toast';
import { validateKenyanPhone, normalizeToE164 } from '@/utils/phone';
import CountryPhoneSelect, { DialCodeCountry } from '@/components/shared/CountryPhoneSelect';
import { CheckoutSupportModal } from '@/components/public/CheckoutSupportModal';
import { SubscriptionPlan, SubscriptionPrice } from '@/components/public/checkout/types';

/**
 * SubscriptionCheckoutView — Isolated checkout flow for Lynk-X Premium subscriptions.
 * Designed for web checkout redirects from PWA and external campaigns.
 *
 * Guarantees:
 * 1. Zero auth token required in query params (unauthenticated guest flow).
 * 2. Contact email & phone are resolved or provisioned to a durable attendee identity.
 * 3. Wallet payment option is hidden when unauthenticated (only external rails shown).
 * 4. Realtime status tracking and manual confirmation via unified lookup.
 */
export const SubscriptionCheckoutView: React.FC = () => {
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();

    // Query parameter initializers
    const initialInterval = searchParams.get('interval') === 'year' ? 'year' : 'month';
    const initialPhone = searchParams.get('phone') || '';
    const initialEmail = searchParams.get('email') || '';

    // State
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>(initialInterval);

    const [currentCheckoutId, setCurrentCheckoutId] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'waiting' | 'completed' | 'failed'>('idle');
    const [paymentError, setPaymentError] = useState('');
    const [manualConfirming, setManualConfirming] = useState(false);
    const [realtimeDisrupted, setRealtimeDisrupted] = useState(false);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

    // Promo code state
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<{
        code: string;
        discount: number;
        promoId: string;
        type: string;
        value: number;
    } | null>(null);
    const [promoError, setPromoError] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        email: initialEmail,
        fullName: '',
        phone: initialPhone.replace(/^\+254/, '0'),
        mpesaNumber: initialPhone.replace(/^\+254/, '0'),
    });
    const [formErrors, setFormErrors] = useState({
        email: '',
        phone: '',
        mpesaNumber: '',
    });
    const [contactPhoneCountry, setContactPhoneCountry] = useState<DialCodeCountry>({
        code: 'KE',
        display_name: 'Kenya',
        phone_prefix: '+254',
        phone_digits: 9,
    });

    // Payment providers
    const [availableProviders, setAvailableProviders] = useState<Array<{
        provider_name: string;
        display_name: string;
        logo_url?: string;
        fee_percent: number;
        base_fee_usd: number;
    }>>([]);
    const [paymentMethod, setPaymentMethod] = useState<string>('mpesa');

    // ── Load Catalog & Providers ──────────────────────────────────────────────
    useEffect(() => {
        let isCancelled = false;
        const loadCatalog = async () => {
            try {
                // Fetch catalog for attendee premium
                const { data: catalogData, error: catalogErr } = await supabase
                    .schema('api')
                    .rpc('get_subscription_catalog', { p_product_type: 'attendee_premium' });

                if (catalogErr) {
                    console.error('Failed to load subscription catalog:', catalogErr.message);
                } else if (catalogData && !isCancelled) {
                    setPlans(catalogData as SubscriptionPlan[]);
                }

                // Fetch available payment providers (KES currency)
                const { data: providers } = await supabase
                    .schema('api')
                    .rpc('get_available_payment_providers', { p_currency: 'KES' });

                if (providers && providers.length > 0 && !isCancelled) {
                    setAvailableProviders(providers);
                    const hasMpesa = (providers as any[]).some(p => p.provider_name === 'mpesa');
                    setPaymentMethod(hasMpesa ? 'mpesa' : providers[0].provider_name);
                }
            } catch (err) {
                console.error('Error initializing subscription checkout:', err);
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        loadCatalog();
        return () => { isCancelled = true; };
    }, [supabase]);

    // Active plan & price for current interval
    const activePlan = useMemo(() => {
        return plans.find(p => p.interval === selectedInterval) || plans[0] || null;
    }, [plans, selectedInterval]);

    const activePrice: SubscriptionPrice | null = useMemo(() => {
        if (!activePlan || !activePlan.subscription_prices?.length) return null;
        // Prefer KES price, else first active price
        const kesPrice = activePlan.subscription_prices.find(p => p.currency === 'KES' && p.is_active);
        return kesPrice || activePlan.subscription_prices.find(p => p.is_active) || activePlan.subscription_prices[0];
    }, [activePlan]);

    // Derived payment amounts with promo discount
    const baseAmount = activePrice?.amount || 0;
    const discountAmount = appliedPromo ? appliedPromo.discount : 0;
    const finalAmount = Math.max(0, baseAmount - discountAmount);

    // Keep applied promo discount synced when interval or base price changes
    useEffect(() => {
        if (!appliedPromo) return;
        let newDiscount = 0;
        if (appliedPromo.type === 'free_entry') {
            newDiscount = baseAmount;
        } else if (appliedPromo.type === 'percent') {
            newDiscount = (baseAmount * appliedPromo.value) / 100;
        } else {
            newDiscount = Math.min(appliedPromo.value, baseAmount);
        }
        setAppliedPromo(prev => prev ? { ...prev, discount: newDiscount } : null);
    }, [baseAmount]);

    // ── Promo Code Validation ─────────────────────────────────────────────────
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

            // Verify the promo code is not restricted to specific event tickets
            try {
                const { data: eventLinks } = await supabase
                    .schema('ticketing')
                    .from('event_promos')
                    .select('event_id')
                    .eq('promo_code_id', promo.id)
                    .limit(1);

                if (eventLinks && eventLinks.length > 0) {
                    setPromoError('This promo code is only valid for event tickets.');
                    setAppliedPromo(null);
                    return;
                }
            } catch {
                // Ignore schema visibility fallback
            }

            let discount = 0;
            if (promo.type === 'free_entry') {
                discount = baseAmount;
            } else if (promo.type === 'percent') {
                discount = (baseAmount * promo.value) / 100;
            } else {
                discount = Math.min(promo.value, baseAmount);
            }

            setAppliedPromo({
                code,
                discount,
                promoId: promo.id,
                type: promo.type,
                value: promo.value,
            });
            setPromoCode('');
            showToast('Promo code applied successfully!', 'success');
        } catch {
            setPromoError('Failed to validate promo code. Please try again.');
        } finally {
            setPromoLoading(false);
        }
    }, [promoCode, baseAmount, supabase, showToast]);

    const handleRemovePromo = () => {
        setAppliedPromo(null);
        showToast('Promo code removed.', 'info');
    };

    // ── Realtime Listener for M-Pesa Completion ───────────────────────────────
    useEffect(() => {
        if (!currentCheckoutId || paymentStatus !== 'waiting') return;

        const timeoutId = setTimeout(() => {
            setPaymentStatus('failed');
            setPaymentError('Payment confirmation timed out. If you completed M-Pesa on your phone, click manual confirmation or contact support.');
            setIsSubmitting(false);
        }, 10 * 60 * 1000);

        const channel = supabase
            .channel(`sub_payment_${currentCheckoutId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'finance',
                    table: 'transactions',
                    filter: `provider_ref=eq.${currentCheckoutId}`,
                },
                (payload) => {
                    const newStatus = payload.new.status;
                    if (newStatus === 'completed') {
                        clearTimeout(timeoutId);
                        setPaymentStatus('completed');
                        setIsSubmitting(false);
                    } else if (newStatus === 'failed' || newStatus === 'cancelled') {
                        clearTimeout(timeoutId);
                        setPaymentStatus('failed');
                        setPaymentError('Payment was not completed. Please try again or use a different number.');
                        setIsSubmitting(false);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setRealtimeDisrupted(true);
                }
            });

        return () => {
            clearTimeout(timeoutId);
            channel.unsubscribe();
        };
    }, [currentCheckoutId, paymentStatus, supabase]);

    // ── Manual Confirmation Fallback ──────────────────────────────────────────
    const handleManualConfirm = async () => {
        if (!currentCheckoutId) return;
        setManualConfirming(true);
        setPaymentError('');

        try {
            const { data, error } = await supabase
                .schema('api')
                .rpc('lookup_pending_payment', { p_provider_ref: currentCheckoutId });

            if (error) {
                setPaymentError('Unable to check payment status. Please try again in a few moments.');
            } else if (data?.status === 'completed') {
                setPaymentStatus('completed');
                setIsSubmitting(false);
            } else if (data?.status === 'pending') {
                setPaymentError('Payment is still processing. Please enter your PIN on your phone if prompted.');
            } else if (data?.status === 'failed' || data?.status === 'cancelled') {
                setPaymentStatus('failed');
                setPaymentError('Payment could not be verified. Please retry or contact support.');
                setIsSubmitting(false);
            }
        } catch {
            setPaymentError('Network error checking payment status. Please try again.');
        } finally {
            setManualConfirming(false);
        }
    };

    // ── Form Input Handlers ───────────────────────────────────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name as keyof typeof formErrors]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // ── Validation & Submission ───────────────────────────────────────────────
    const handlePayment = async () => {
        if (!activePrice) {
            showToast('No active price available for this plan.', 'error');
            return;
        }

        const errors = { email: '', phone: '', mpesaNumber: '' };
        let hasError = false;

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
            errors.email = 'Valid email address required';
            hasError = true;
        }

        // Contact phone validation
        const cleanContact = formData.phone.replace(/[\s-]/g, '');
        if (!cleanContact) {
            errors.phone = 'Phone number is required';
            hasError = true;
        } else if (contactPhoneCountry.code === 'KE' && !validateKenyanPhone(cleanContact)) {
            errors.phone = 'Valid Kenyan phone number required (e.g. 0712345678)';
            hasError = true;
        }

        // M-Pesa number validation
        if (paymentMethod === 'mpesa') {
            const cleanMpesa = formData.mpesaNumber.replace(/[\s-]/g, '');
            if (!cleanMpesa) {
                errors.mpesaNumber = 'M-Pesa phone number required';
                hasError = true;
            } else if (!validateKenyanPhone(cleanMpesa)) {
                errors.mpesaNumber = 'Valid Kenyan phone number required (e.g. 0712345678)';
                hasError = true;
            }
        }

        setFormErrors(errors);
        if (hasError) return;

        setIsSubmitting(true);
        setPaymentError('');

        try {
            // Normalize contact phone
            const normalizedContactPhone = contactPhoneCountry.code === 'KE'
                ? normalizeToE164(formData.phone, 'KE') || formData.phone
                : `${contactPhoneCountry.phone_prefix}${formData.phone.replace(/^0+/, '')}`;

            // 1. Resolve or provision durable user identity by phone & email
            const { data: userId, error: userError } = await supabase
                .schema('api')
                .rpc('resolve_or_create_checkout_user', {
                    p_phone: normalizedContactPhone,
                    p_email: formData.email.trim().toLowerCase(),
                    p_full_name: formData.fullName.trim() || formData.email.split('@')[0],
                    p_country_code: contactPhoneCountry.code,
                });

            if (userError || !userId) {
                throw new Error(`Account setup failed: ${userError?.message || 'Unable to register attendee'}`);
            }

            // 2. Normalize payment phone for M-Pesa
            const normalizedMpesaPhone = normalizeToE164(formData.mpesaNumber, 'KE') || formData.mpesaNumber;

            // 3. Initiate payment / STK Push via edge function
            const { data: mpesaRes, error: mpesaErr } = await supabase.functions.invoke('mpesa-stk-push', {
                body: {
                    phone: normalizedMpesaPhone,
                    amount: finalAmount,
                    currency: activePrice.currency,
                    metadata: {
                        purpose: 'subscription',
                        price_id: activePrice.id,
                        user_id: userId,
                        email: formData.email.trim().toLowerCase(),
                        phone: normalizedContactPhone,
                        promo_code: appliedPromo?.code || null,
                    },
                },
            });

            if (mpesaErr) {
                throw new Error(mpesaErr.message || 'Payment initiation failed. Please try again.');
            }

            if (!mpesaRes?.success) {
                throw new Error(mpesaRes?.error || 'Failed to initiate M-Pesa payment');
            }

            // Zero-cost / 100% discount promo completes immediately without STK prompt
            if (mpesaRes.isCompleted) {
                setPaymentStatus('completed');
                setIsSubmitting(false);
                return;
            }

            setCurrentCheckoutId(mpesaRes.checkoutRequestId);
            setPaymentStatus('waiting');
        } catch (err: any) {
            console.error('Subscription checkout error:', err);
            setPaymentError(err?.message || 'Payment initiation failed. Please check your network and try again.');
            setIsSubmitting(false);
        }
    };

    // ── Render: Completed State ───────────────────────────────────────────────
    if (paymentStatus === 'completed') {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <Link href="/" className={styles.logoContainer}>
                        <Image src="/lynk-x_combined_logo.svg" alt="Lynk-X" width={200} height={60} className={styles.logo} priority />
                    </Link>
                </header>
                <main className={styles.content}>
                    <div style={{ maxWidth: 640, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
                        <div style={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '2px solid #22c55e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            color: '#22c55e',
                        }}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Welcome to Lynk-X Premium!</h1>
                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
                            Your subscription has been activated for <strong>{formData.email}</strong>.<br />
                            Enjoy ad-free event forums, exclusive attendee badge, and early access to upcoming features.
                        </p>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 16,
                            padding: 24,
                            marginBottom: 36,
                            textAlign: 'left',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Plan</span>
                                <span style={{ fontWeight: 600 }}>Attendee Premium ({selectedInterval === 'year' ? 'Yearly' : 'Monthly'})</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Amount Paid</span>
                                <span style={{ fontWeight: 600 }}>{activePrice?.currency} {finalAmount.toLocaleString()}</span>
                            </div>
                            {appliedPromo && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Promo Applied</span>
                                    <span style={{ fontWeight: 600, color: 'var(--color-brand-primary, #20f928)' }}>{appliedPromo.code} (-{activePrice?.currency} {appliedPromo.discount.toLocaleString()})</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Account</span>
                                <span style={{ fontWeight: 600 }}>{formData.phone}</span>
                            </div>
                        </div>
                        <a
                            href="https://app.lynk-x.app/settings/subscription"
                            style={{
                                display: 'inline-block',
                                width: '100%',
                                maxWidth: 360,
                                padding: '16px 24px',
                                background: 'var(--color-brand-primary, #20f928)',
                                color: '#000',
                                fontWeight: 700,
                                fontSize: 16,
                                borderRadius: 12,
                                textDecoration: 'none',
                                textAlign: 'center',
                            }}
                        >
                            Return to Lynk-X App
                        </a>
                    </div>
                </main>
            </div>
        );
    }

    // ── Render: Checkout Form ─────────────────────────────────────────────────
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn} aria-label="Go back">
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

            <main className={styles.content}>
                <div className={styles.layoutGrid}>
                    {/* Left Column: Plan Summary */}
                    <div className={styles.summaryColumn}>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Subscription Summary</h2>

                            {/* Interval Toggle */}
                            <div style={{
                                display: 'flex',
                                background: 'rgba(255, 255, 255, 0.06)',
                                borderRadius: 12,
                                padding: 4,
                                marginBottom: 20,
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedInterval('month')}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        borderRadius: 8,
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        background: selectedInterval === 'month' ? 'var(--color-brand-primary, #20f928)' : 'transparent',
                                        color: selectedInterval === 'month' ? '#000' : 'rgba(255, 255, 255, 0.7)',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    Monthly
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedInterval('year')}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        borderRadius: 8,
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        background: selectedInterval === 'year' ? 'var(--color-brand-primary, #20f928)' : 'transparent',
                                        color: selectedInterval === 'year' ? '#000' : 'rgba(255, 255, 255, 0.7)',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    Yearly <span style={{ fontSize: 11, opacity: 0.8 }}>(Save 16%)</span>
                                </button>
                            </div>

                            {isLoading ? (
                                <>
                                    <Skeleton width="100%" height="24px" className={styles.summaryItem} style={{ margin: '8px 0' }} />
                                    <Skeleton width="100%" height="40px" className={styles.total} style={{ marginTop: 16 }} />
                                </>
                            ) : (
                                <>
                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        borderRadius: 12,
                                        padding: 16,
                                        marginBottom: 16,
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                    }}>
                                        <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>Attendee Premium</h3>
                                        <p style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 12px' }}>
                                            Full premium privileges across the Lynk-X ecosystem.
                                        </p>
                                        <ul style={{ margin: 0, paddingLeft: 18, color: 'rgba(255, 255, 255, 0.8)', fontSize: 13, lineHeight: 1.8 }}>
                                            <li>Ad-free forum discussions</li>
                                            <li>Exclusive VIP attendee badge</li>
                                            <li>Early access to high-demand ticket drops</li>
                                            <li>Cancel anytime before next billing cycle</li>
                                        </ul>
                                    </div>

                                    <div className={styles.summaryItem}>
                                        <span>Billing Cycle</span>
                                        <span style={{ textTransform: 'capitalize' }}>{selectedInterval}ly</span>
                                    </div>

                                    {/* ── Promo Code Section ────────────────────────── */}
                                    {appliedPromo ? (
                                        <div className={`${styles.summaryItem} ${styles.discount}`}>
                                            <div className={styles.appliedPromoInfo}>
                                                <span>
                                                    Promo: {appliedPromo.code}
                                                    {appliedPromo.type === 'percent' && ` (-${appliedPromo.value}%)`}
                                                    {appliedPromo.type === 'fixed' && ` (-${activePrice?.currency} ${appliedPromo.value})`}
                                                    {appliedPromo.type === 'free_entry' && ` (Free)`}
                                                </span>
                                                <button onClick={handleRemovePromo} className={styles.removePromoBtn}>Remove</button>
                                            </div>
                                            <span>-{activePrice?.currency} {appliedPromo.discount.toLocaleString()}</span>
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
                                                    className={styles.filledActionBtn}
                                                    disabled={promoLoading || !promoCode.trim()}
                                                >
                                                    {promoLoading ? '…' : 'Apply'}
                                                </button>
                                            </div>
                                            {promoError && <p className={styles.promoError}>{promoError}</p>}
                                        </div>
                                    )}

                                    <div className={styles.total}>
                                        <span>Total Due Today</span>
                                        <span>
                                            {activePrice ? `${activePrice.currency} ${finalAmount.toLocaleString()}` : '—'}
                                        </span>
                                    </div>
                                </>
                            )}
                        </section>
                    </div>

                    {/* Right Column: Contact & Payment Forms */}
                    <div className={styles.formsColumn}>
                        {/* Contact Information */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Account & Delivery</h2>
                            <p style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 16px' }}>
                                Your premium subscription will automatically attach to this phone number and email address.
                            </p>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className={`${styles.input} ${formErrors.email ? styles.inputError : ''}`}
                                    placeholder="you@example.com"
                                />
                                {formErrors.email && <span className={styles.errorText}>{formErrors.email}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Full Name (Optional)</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder="Your name"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Contact Phone Number</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <CountryPhoneSelect
                                        value={contactPhoneCountry.code}
                                        onChange={setContactPhoneCountry}
                                    />
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className={`${styles.input} ${formErrors.phone ? styles.inputError : ''}`}
                                        placeholder={contactPhoneCountry.code === 'KE' ? '07XXXXXXXX' : 'Phone digits'}
                                        style={{ flex: 1 }}
                                    />
                                </div>
                                {formErrors.phone && <span className={styles.errorText}>{formErrors.phone}</span>}
                            </div>
                        </section>

                        {/* Payment Method */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Payment Method</h2>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Choose Provider</label>
                                <select
                                    className={styles.select}
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                >
                                    {availableProviders.length > 0 ? (
                                        availableProviders
                                            // Ensure in-app wallet is filtered out for unauthenticated guests
                                            .filter(p => p.provider_name !== 'in-app' && p.provider_name !== 'wallet')
                                            .map(p => (
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
                                    <label className={styles.label}>M-Pesa Number for Payment</label>
                                    <input
                                        type="tel"
                                        name="mpesaNumber"
                                        value={formData.mpesaNumber}
                                        onChange={handleInputChange}
                                        className={`${styles.input} ${formErrors.mpesaNumber ? styles.inputError : ''}`}
                                        placeholder="07XXXXXXXX"
                                    />
                                    {formErrors.mpesaNumber && <span className={styles.errorText}>{formErrors.mpesaNumber}</span>}
                                    <p className={styles.helperText}>* An STK push prompt will be sent to this number to authorize payment.</p>
                                </div>
                            )}

                            {paymentMethod !== 'mpesa' && (
                                <p className={styles.helperText}>* You will be prompted to complete payment via {paymentMethod}.</p>
                            )}
                        </section>

                        {/* Actions */}
                        <div className={styles.footerActions}>
                            {paymentError && (
                                <div style={{
                                    marginBottom: '1rem',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                }}>
                                    <p style={{ color: 'var(--color-interface-error, #ef4444)', fontSize: '14px', margin: '0 0 8px' }}>
                                        {paymentError}
                                    </p>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button
                                            type="button"
                                            onClick={() => { setPaymentError(''); setPaymentStatus('idle'); setIsSubmitting(false); }}
                                            style={{
                                                fontSize: '13px',
                                                padding: '6px 14px',
                                                borderRadius: '6px',
                                                border: '1px solid rgba(239, 68, 68, 0.5)',
                                                background: 'transparent',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Try Again
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsSupportModalOpen(true)}
                                            style={{
                                                fontSize: '13px',
                                                padding: '6px 14px',
                                                borderRadius: '6px',
                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                background: 'transparent',
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Contact Support
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isLoading ? (
                                <Skeleton width="100%" height="56px" borderRadius="8px" />
                            ) : (
                                <button
                                    onClick={handlePayment}
                                    className={styles.payBtn}
                                    disabled={isSubmitting || !activePrice}
                                >
                                    {isSubmitting
                                        ? 'Initiating Payment…'
                                        : activePrice
                                            ? finalAmount === 0
                                                ? 'Activate Free Subscription'
                                                : `Confirm & Pay ${activePrice.currency} ${finalAmount.toLocaleString()}`
                                            : 'Select a Plan'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Waiting for STK Push Modal */}
            {paymentStatus === 'waiting' && (
                <div className={styles.overlay}>
                    <div className={styles.modal}>
                        <Spinner size={40} />
                        <h2 className={styles.waitingTitle}>Check your phone</h2>
                        <p className={styles.waitingText}>
                            A prompt has been sent to <strong>{formData.mpesaNumber}</strong>.<br />
                            Please enter your M-Pesa PIN to complete your Premium subscription.
                        </p>
                        <p className={styles.helperText}>Waiting for M-Pesa confirmation...</p>
                        {realtimeDisrupted && (
                            <p style={{ fontSize: '13px', color: '#ef4444', margin: '0 0 8px', textAlign: 'center' }}>
                                Status update socket was interrupted. If you approved the PIN on your phone, click below to confirm.
                            </p>
                        )}
                        {paymentError && (
                            <p style={{ fontSize: '13px', color: '#ef4444', margin: '0 0 8px', textAlign: 'center' }}>
                                {paymentError}
                            </p>
                        )}
                        <button
                            className={styles.primaryBtn}
                            disabled={manualConfirming}
                            onClick={handleManualConfirm}
                        >
                            {manualConfirming ? 'Verifying payment…' : "I've completed payment"}
                        </button>
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

            <CheckoutSupportModal
                isOpen={isSupportModalOpen}
                onClose={() => setIsSupportModalOpen(false)}
                checkoutId={currentCheckoutId}
                eventName="Lynk-X Premium Subscription"
                phone={formData.phone}
                paymentError={paymentError}
            />
        </div>
    );
};

export default SubscriptionCheckoutView;
