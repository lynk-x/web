"use client";

import React, { useState } from 'react';
import styles from './PaymentMethodForm.module.css';
import { useRouter } from 'next/navigation';

export interface PaymentMethodData {
    cardName: string;
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    billingZip: string;
}

interface PaymentMethodFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function PaymentMethodForm({ onSuccess, onCancel }: PaymentMethodFormProps) {
    const router = useRouter();
    const [formData, setFormData] = useState<PaymentMethodData>({
        cardName: '',
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        billingZip: ''
    });

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
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Saving payment method:', formData);
        if (onSuccess) onSuccess();
        else router.push('/dashboard/ads/billing');
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

                <div className={styles.actions}>
                    <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        onClick={onCancel || (() => router.back())}
                    >
                        Cancel
                    </button>
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                        Save Payment Method
                    </button>
                </div>
            </form>
        </div>
    );
}
