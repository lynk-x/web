"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface PaymentProvider {
  provider_name: string;
  display_name: string;
  logo_url?: string;
  fee_percent: number;
  base_fee_usd: number;
}

export function usePaymentProviders(currency: string, supabase: ReturnType<typeof createClient>) {
  const [availableProviders, setAvailableProviders] = useState<PaymentProvider[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>('mpesa');
  const [loading, setLoading] = useState(true);

  const loadProviders = useCallback(async () => {
    try {
      const { data: providers } = await supabase.schema('api').rpc('get_available_payment_providers', {
        p_currency: currency
      });

      if (providers && providers.length > 0) {
        const typedProviders = providers as PaymentProvider[];
        setAvailableProviders(typedProviders);
        const hasMpesa = typedProviders.some(p => p.provider_name === 'mpesa');
        setPaymentMethod(hasMpesa ? 'mpesa' : typedProviders[0].provider_name);
      }
    } catch (err) {
      console.error('Failed to load payment providers:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, currency]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  return {
    availableProviders,
    paymentMethod,
    setPaymentMethod,
    loading,
  };
}
