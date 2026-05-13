"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface Country {
    code: string;
    display_name: string;
}

export function useCountries() {
    const [countries, setCountries] = useState<Country[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        const fetchCountries = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('countries')
                    .select('code, display_name')
                    .eq('status', 'approved')
                    .order('display_name');

                if (error) throw error;
                if (data) setCountries(data);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch countries');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCountries();
    }, [supabase]);

    return { countries, isLoading, error };
}
