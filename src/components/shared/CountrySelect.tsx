"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';

interface Country {
    code: string;
    name: string;
}

interface CountrySelectProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
}

export default function CountrySelect({
    value,
    onChange,
    className,
    placeholder = "Select Country...",
    disabled = false
}: CountrySelectProps) {
    const supabase = useMemo(() => createClient(), []);
    const [countries, setCountries] = useState<Country[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchCountries = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('countries')
                    .select('code, display_name')
                    .eq('is_active', true)
                    .order('display_name', { ascending: true });

                if (error) throw error;
                setCountries(data.map(c => ({
                    code: c.code,
                    name: c.display_name
                })));
            } catch (err) {
                console.error('Failed to load countries:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCountries();
    }, [supabase]);

    return (
        <select
            className={className || adminStyles.input}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || isLoading}
        >
            <option value="">{isLoading ? 'Loading countries...' : placeholder}</option>
            {countries.map((country) => (
                <option key={country.code} value={country.code}>
                    {country.name}
                </option>
            ))}
        </select>
    );
}
