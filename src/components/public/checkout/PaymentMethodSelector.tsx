"use client";

import React from 'react';
import styles from '@/components/public/CheckoutView.module.css';

export interface PaymentProvider {
  provider_name: string;
  display_name: string;
  logo_url?: string;
  fee_percent: number;
  base_fee_usd: number;
}

interface PaymentMethodSelectorProps {
  providers: PaymentProvider[];
  selectedMethod: string;
  onChange: (method: string) => void;
}

/**
 * Renders the payment provider dropdown using the shared CheckoutView
 * `.select` style.
 */
export function PaymentMethodSelector({ providers, selectedMethod, onChange }: PaymentMethodSelectorProps) {
  return (
    <select
      aria-label="Payment Method"
      value={selectedMethod}
      onChange={(e) => onChange(e.target.value)}
      className={styles.select}
    >
      {providers.length > 0 ? (
        providers.map((provider) => (
          <option key={provider.provider_name} value={provider.provider_name}>
            {provider.display_name}
          </option>
        ))
      ) : (
        <option value="mpesa">M-Pesa</option>
      )}
    </select>
  );
}
