"use client";

import React from 'react';
import styles from '@/components/features/events/EventForm.module.css';
import { useCurrencies } from '@/hooks/useCurrencies';

interface CurrencySelectorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({ 
    value, 
    onChange,
    className 
}) => {
    const { currencies, isLoading } = useCurrencies();

    return (
        <select
            className={`${styles.selectInput} ${className}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isLoading}
        >
            {isLoading ? (
                <option value="">Loading Currencies...</option>
            ) : (
                currencies.map(c => (
                    <option key={c.code} value={c.code}>{c.code} - {c.country_name}</option>
                ))
            )}
            {!isLoading && currencies.length === 0 && (
                <option value="KES">KES - Kenyan Shilling</option>
            )}
            {!isLoading && currencies.length > 0 && !currencies.some(c => c.code === value) && value && (
                <option value={value}>{value}</option>
            )}
        </select>
    );
};
