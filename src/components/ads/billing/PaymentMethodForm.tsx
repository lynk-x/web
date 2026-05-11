"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState, useMemo } from 'react';
import styles from './PaymentMethodForm.module.css';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PaymentMethodData {
    cardName: string;
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    billingZip: string;
}

interface PaymentMethodFormProps {
    /** The account to attach this payment method to. */
    accountId: string;
    /** Pre-created Supabase client passed in from the parent (avoids creating a second client). */
    supabase: SupabaseClient;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function PaymentMethodForm({ accountId, supabase, onSuccess, onCancel }: PaymentMethodFormProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<PaymentMethodData>({
        cardName: '',
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        billingZip: ''
    });
    const [formError, setFormError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        // Basic card number formatting
        if (name === 'cardNumber') {
            const formatted = value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
            setFormData(prev => ({ ...prev, [name]: formatted }));
            return;
        }

        // Expiry date formatting (MM/YY)
        if (name === 'expiryDate') {
            const formatted = value.replace(/\D/g, '').replace(/(.{2})/g, '$1/').trim().slice(0, 5);
            if (formatted.endsWith('/')) {
                setFormData(prev => ({ ...prev, [name]: formatted.slice(0, -1) }));
            } else {
                setFormData(prev => ({ ...prev, [name]: formatted }));
            }
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));

        if (formError) setFormError('');
    };

    const validateForm = (): boolean => {
        if (!formData.cardName.trim()) {
            setFormError('Cardholder name is required.');
            return false;
        }

        const rawCard = formData.cardNumber.replace(/\s/g, '');
        if (rawCard.length < 15 || rawCard.length > 16 || isNaN(Number(rawCard))) {
            setFormError('Valid 15 or 16 digit card number is required.');
            return false;
        }

        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(formData.expiryDate)) {
            setFormError('Valid expiry date (MM/YY) is required.');
            return false;
        }

        if (formData.cvv.length < 3 || isNaN(Number(formData.cvv))) {
            setFormError('Valid 3 or 4 digit CVV is required.');
            return false;
        }

        if (!formData.billingZip.trim() || formData.billingZip.length < 5) {
            setFormError('Valid billing zip code is required.');
            return false;
        }

        return true;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSaving(true);
        try {
            const rawCard = formData.cardNumber.replace(/\s/g, '');
            const last4 = rawCard.slice(-4);

            /**
             * IMPORTANT: We never store the full PAN.
             * In production this form would tokenise the card via Stripe/Paystack first;
             * here we only persist presentation metadata (last4, expiry, holder name).
             */
            const { error } = await supabase
                .from('account_payment_methods')
                .insert({
                    account_id: accountId,
                    type: 'card',
                    label: `Card ending in ${last4}`,
                    is_default: false,
                    metadata: {
                        last4,
                        expiry: formData.expiryDate,
                        cardholder_name: formData.cardName,
                        billing_zip: formData.billingZip
                    }
                });

            if (error) throw error;

            showToast('Payment method saved successfully.', 'success');
            if (onSuccess) onSuccess();
            else router.push('/dashboard/ads/finance');
        } catch (err: unknown) {
            setFormError(getErrorMessage(err) || 'Failed to save payment method.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.cardPreview}>
                <div className={styles.cardType}>VISA</div>
                <div className={styles.cardNumber}>
                    {formData.cardNumber || '•••• •••• •••• ••••'}
                </div>
                <div className={styles.cardDetails}>
                    <div>
                        <div style={{ opacity: 0.7, marginBottom: '4px' }}>Card Holder</div>
                        <div style={{ fontWeight: 600 }}>{formData.cardName || 'YOUR NAME'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ opacity: 0.7, marginBottom: '4px' }}>Expires</div>
                        <div style={{ fontWeight: 600 }}>{formData.expiryDate || 'MM/YY'}</div>
                    </div>
                </div>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Cardholder Name</label>
                    <input
                        type="text"
                        name="cardName"
                        className={styles.input}
                        placeholder="e.g. John Doe"
                        value={formData.cardName}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Card Number</label>
                    <input
                        type="text"
                        name="cardNumber"
                        className={styles.input}
                        placeholder="0000 0000 0000 0000"
                        value={formData.cardNumber}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className={styles.row}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Expiry Date</label>
                        <input
                            type="text"
                            name="expiryDate"
                            className={styles.input}
                            placeholder="MM/YY"
                            value={formData.expiryDate}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>CVV</label>
                        <input
                            type="password"
                            name="cvv"
                            className={styles.input}
                            placeholder="•••"
                            maxLength={4}
                            value={formData.cvv}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Billing Zip Code</label>
                    <input
                        type="text"
                        name="billingZip"
                        className={styles.input}
                        placeholder="10001"
                        value={formData.billingZip}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                {formError && (
                    <div style={{ color: 'var(--color-interface-error)', fontSize: '13px', textAlign: 'center', marginBottom: '16px' }}>
                        {formError}
                    </div>
                )}

                <div className={styles.actions}>
                    <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        onClick={onCancel || (() => router.back())}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Payment Method'}
                    </button>
                </div>
            </form>
        </div>
    );
}
