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
 * Renders selectable payment provider cards styled with the shared
 * CheckoutView CSS module design tokens.
 */
export function PaymentMethodSelector({ providers, selectedMethod, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className={styles.paymentGrid}>
      {providers.map((provider) => {
        const isSelected = selectedMethod === provider.provider_name;
        const hasBaseFee = provider.base_fee_usd > 0;
        const feeText = provider.fee_percent > 0
          ? `${provider.fee_percent}% fee${hasBaseFee ? ` +$${provider.base_fee_usd}` : ''}`
          : hasBaseFee
            ? `+$${provider.base_fee_usd} fee`
            : 'No extra fee';

        return (
          <button
            key={provider.provider_name}
            type="button"
            onClick={() => onChange(provider.provider_name)}
            aria-pressed={isSelected}
            className={`${styles.paymentOption} ${isSelected ? styles.paymentOptionSelected : ''}`}
          >
            <div className={styles.paymentOptionHeader}>
              {provider.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={provider.logo_url} alt={provider.display_name} className={styles.paymentOptionLogo} />
              ) : (
                <div className={styles.paymentOptionFallback}>
                  {provider.provider_name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className={styles.paymentOptionName}>{provider.display_name}</span>
            </div>
            <span className={styles.paymentOptionFee}>{feeText}</span>
          </button>
        );
      })}
    </div>
  );
}
