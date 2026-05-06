"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface Currency {
    code: string;
    symbol: string;
    country_name: string;
}

export function useCurrencies() {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        const fetchCurrencies = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('countries')
                    .select('currency, currency_symbol, display_name')
                    .eq('is_active', true)
                    .order('currency');

                if (error) throw error;
                if (data) {
                    // Deduplicate currencies if multiple countries share the same currency
                    const unique = data.reduce((acc: Currency[], current: any) => {
                        if (!acc.find(c => c.code === current.currency)) {
                            acc.push({
                                code: current.currency,
                                symbol: current.currency_symbol,
                                country_name: current.display_name
                            });
                        }
                        return acc;
                    }, []);
                    setCurrencies(unique);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to fetch currencies');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCurrencies();
    }, [supabase]);

    return { currencies, isLoading, error };
}
