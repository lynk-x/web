"use client";

import React from 'react';
import styles from '@/components/public/CheckoutView.module.css';

interface PromoCodeInputProps {
  promoCode: string;
  setPromoCode: (code: string) => void;
  appliedPromo: {
    code: string;
    discount: number;
    promoId: string;
    type: string;
    value: number;
  } | null;
  promoError: string;
  promoLoading: boolean;
  handleApplyPromo: () => void;
  handleRemovePromo: () => void;
}

/**
 * Renders the promo code input row, apply button and validation feedback
 * using the shared CheckoutView CSS module styles.
 */
export function PromoCodeInput({
  promoCode,
  setPromoCode,
  promoError,
  promoLoading,
  handleApplyPromo,
}: PromoCodeInputProps) {
  return (
    <>
      <div className={styles.promoInputWrapper}>
        <input
          type="text"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
          placeholder="Promo code"
          className={styles.promoInput}
          disabled={promoLoading}
        />
        <button
          type="button"
          onClick={handleApplyPromo}
          disabled={promoLoading || !promoCode.trim()}
          className={styles.filledActionBtn}
        >
          {promoLoading ? '…' : 'Apply'}
        </button>
      </div>

      {promoError && <p className={styles.promoError}>{promoError}</p>}
    </>
  );
}
