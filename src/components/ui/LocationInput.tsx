"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from './LocationInput.module.css';

interface Suggestion {
    id: string;
    text: string;
    place_name: string;
    place_id: string;
}

interface LocationInputProps {
    value: string;
    onChange: (value: string, coordinates?: [number, number]) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

/**
 * LocationInput — A premium address autocomplete component using Google Places API
 * proxied through Supabase Edge Functions.
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
    const [proximity, setProximity] = useState<[number, number] | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    // ── PROXIMITY BIASING ───────────────────────────────────────────────────
    useEffect(() => {
        if (!("geolocation" in navigator)) return;
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
            if (result.state === 'granted') {
                navigator.geolocation.getCurrentPosition(
                    (pos) => setProximity([pos.coords.longitude, pos.coords.latitude]),
                    () => {},
                    { timeout: 5000 }
                );
            }
        });
    }, []);

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

    // Debounced search logic (Google Autocomplete Predictions)
    const fetchSuggestions = useCallback(async (query: string) => {
        if (query.length < 3) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('address-autocomplete', {
                body: { 
                    query,
                    proximity_lng: proximity?.[0],
                    proximity_lat: proximity?.[1]
                }
            });

            if (error) throw error;
            setSuggestions(data.suggestions || []);
            setIsOpen(true);
        } catch (err) {
            console.error('Autocomplete error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, proximity]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (inputValue && inputValue !== value && isOpen) {
                fetchSuggestions(inputValue);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [inputValue, value, isOpen, fetchSuggestions]);

    const handleSelect = async (suggestion: Suggestion) => {
        setInputValue(suggestion.place_name);
        setIsLoading(true);
        
        try {
            // Fetch Place Details to get coordinates (lng, lat)
            const { data, error } = await supabase.functions.invoke('address-autocomplete', {
                body: { place_id: suggestion.place_id }
            });

            if (error) throw error;

            onChange(data.place_name || suggestion.place_name, data.center);
        } catch (err) {
            console.error('Details fetch error:', err);
            // Fallback: just use the name without coordinates
            onChange(suggestion.place_name);
        } finally {
            setIsLoading(false);
            setIsOpen(false);
        }
    };

    return (
        <div className={`${styles.container} ${className}`} ref={containerRef}>
            <input
                type="text"
                className={styles.input}
                value={inputValue}
                onChange={(e) => {
                    const newValue = e.target.value;
                    setInputValue(newValue);
                    setIsOpen(true);
                    
                    // Allow raw text input to be accepted by the parent form immediately
                    onChange(newValue, undefined);
                    
                    if (!newValue) {
                        setSuggestions([]);
                    }
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        setIsOpen(false);
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

