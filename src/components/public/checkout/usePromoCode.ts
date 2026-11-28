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

export interface UsePromoCodeOptions {
  /** Checkout surface requesting validation; determines event_promos scope rules. */
  scope?: 'ticket' | 'subscription';
  /** Event IDs in the ticket cart when `scope === 'ticket'`. */
  eventIds?: string[];
}

/**
 * Manages promo-code entry, server-side validation via `api.validate_promo_code`,
 * and discount calculation for ticket and subscription checkout flows.
 */
export function usePromoCode(
  baseAmount: number,
  supabase: ReturnType<typeof createClient>,
  options: UsePromoCodeOptions = {}
) {
  const { scope = 'ticket', eventIds } = options;
  const eventIdsKey = (eventIds ?? []).join(',');
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
      // Server RPC checks active/date/usage limits and ticketing.event_promos scope
      // without exposing the ticketing schema to browser clients.
      const { data: result, error } = await supabase
        .schema('api')
        .rpc('validate_promo_code', {
          p_code: code,
          p_scope: scope,
          p_event_ids: eventIds && eventIds.length > 0 ? eventIds : null,
        });

      if (error || !result || !result.valid) {
        setPromoError(
          (result as { error?: string } | null)?.error ||
            'Promo code not found. Please check the code and try again.'
        );
        setAppliedPromo(null);
        return;
      }

      const promoValue = Number(result.value ?? 0);
      let discount = 0;
      if (result.type === 'free_entry') {
        discount = baseAmount;
      } else if (result.type === 'percent') {
        discount = (baseAmount * promoValue) / 100;
      } else {
        discount = Math.min(promoValue, baseAmount);
      }

      setAppliedPromo({
        code: String(result.code ?? code),
        discount,
        promoId: String(result.id),
        type: String(result.type),
        value: promoValue,
      });
      setPromoCode('');
      showToast('Promo code applied successfully!', 'success');
    } catch {
      setPromoError('Failed to validate promo code. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  }, [promoCode, baseAmount, supabase, showToast, scope, eventIdsKey]);

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
