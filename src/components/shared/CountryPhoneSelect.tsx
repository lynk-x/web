"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface DialCodeCountry {
    code: string;
    display_name: string;
    phone_prefix: string;
    phone_digits: number | null;
}

interface CountryPhoneSelectProps {
    value: string; // country code, e.g. "KE"
    onChange: (country: DialCodeCountry) => void;
    className?: string;
    disabled?: boolean;
}

/**
 * Dial-code dropdown for phone-number fields, backed by api.v1_countries'
 * phone_prefix/phone_digits columns. Distinct from CountrySelect.tsx (that's
 * a country-of-record picker with no dial-code data) — this is specifically
 * for prefixing a phone input so checkout's contact-phone field and the PWA
 * login OTP field normalize to the same E.164 shape.
 */
export default function CountryPhoneSelect({
    value, onChange, className, disabled = false,
}: CountryPhoneSelectProps) {
    const supabase = useMemo(() => createClient(), []);
    const [countries, setCountries] = useState<DialCodeCountry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchCountries = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .schema('api')
                    .from('v1_countries')
                    .select('code, display_name, phone_prefix, phone_digits')
                    .eq('is_active', true)
                    .not('phone_prefix', 'is', null)
                    .order('display_name', { ascending: true });
                if (error) throw error;
                setCountries(data || []);
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
            className={className}
            value={value}
            disabled={disabled || isLoading}
            onChange={(e) => {
                const country = countries.find((c) => c.code === e.target.value);
                if (country) onChange(country);
            }}
        >
            {countries.length === 0 && <option value="">{isLoading ? 'Loading…' : 'Select country'}</option>}
            {countries.map((country) => (
                <option key={country.code} value={country.code}>
                    {country.phone_prefix} ({country.code})
                </option>
            ))}
        </select>
    );
}
