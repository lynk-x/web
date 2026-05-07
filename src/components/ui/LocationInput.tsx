"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from './LocationInput.module.css';

interface Suggestion {
    id: string;
    text: string;
    place_name: string;
    center: [number, number];
}

interface LocationInputProps {
    value: string;
    onChange: (value: string, coordinates?: [number, number]) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

/**
 * LocationInput — A premium address autocomplete component that securely proxies 
 * Mapbox Geocoding requests through a Supabase Edge Function.
 */
export const LocationInput: React.FC<LocationInputProps> = ({
    value,
    onChange,
    placeholder = "Enter location...",
    className,
    disabled = false
}) => {
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    // Sync external value
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Handle clicks outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search logic
    const fetchSuggestions = useCallback(async (query: string) => {
        if (query.length < 3) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('address-autocomplete', {
                body: { query }
            });

            if (error) throw error;
            setSuggestions(data.suggestions || []);
            setIsOpen(true);
        } catch (err) {
            console.error('Autocomplete error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (inputValue && inputValue !== value && isOpen) {
                fetchSuggestions(inputValue);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [inputValue, value, isOpen, fetchSuggestions]);

    const handleSelect = (suggestion: Suggestion) => {
        setInputValue(suggestion.place_name);
        onChange(suggestion.place_name, suggestion.center);
        setIsOpen(false);
    };

    return (
        <div className={`${styles.container} ${className}`} ref={containerRef}>
            <input
                type="text"
                className={styles.input}
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    setIsOpen(true);
                    if (!e.target.value) {
                        onChange('', undefined);
                        setSuggestions([]);
                    }
                }}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete="off"
            />
            <div className={styles.icon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
            </div>

            {isOpen && (inputValue.length >= 3 || isLoading) && (
                <div className={styles.suggestions}>
                    {isLoading ? (
                        <div className={styles.loading}>Searching...</div>
                    ) : suggestions.length > 0 ? (
                        suggestions.map((s) => (
                            <div 
                                key={s.id} 
                                className={styles.suggestion}
                                onClick={() => handleSelect(s)}
                            >
                                <span className={styles.mainText}>{s.text}</span>
                                <span className={styles.subText}>{s.place_name}</span>
                            </div>
                        ))
                    ) : (
                        <div className={styles.noResults}>No locations found</div>
                    )}
                </div>
            )}
        </div>
    );
};
