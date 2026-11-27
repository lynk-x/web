"use client";

import { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';

export interface PromoCodeState {
  code: string;
  appliedPromo: {
    code: string;
    discount: number;
    promoId: string;
    type: string;
    value: number;
  } | null;
  promoError: string;
  promoLoading: boolean;
}

export function usePromoCode(baseAmount: number, supabase: ReturnType<typeof createClient>) {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCodeState['appliedPromo']>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const { showToast } = useToast();

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

  return {
    promoCode,
    setPromoCode,
    appliedPromo,
    setAppliedPromo,
    promoError,
    promoLoading,
    handleApplyPromo,
    handleRemovePromo,
  };
}
