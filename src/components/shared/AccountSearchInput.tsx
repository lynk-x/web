"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from './AccountSearchInput.module.css';

export interface AccountOption {
    id: string;
    reference: string;
    display_name: string;
    type: string;
    country_code: string | null;
}

export interface AccountSearchInputProps {
    value: string;                     // Currently selected account UUID
    onChange: (accountId: string) => void;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    /** Restrict to specific account types (default: all business types, excludes attendee) */
    types?: string[];
    /** Max results */
    limit?: number;
    /** Optional ISO 3166-1 alpha-2 country filter — when set, the dropdown and initial fetch
     *  are scoped to accounts with this country_code. Undefined/empty = no country restriction. */
    countryCode?: string | null;
}

const ACCOUNT_TYPES: string[] = ['organizer', 'advertiser', 'platform', 'pulse_user', 'system'];

function buildLabel(a: AccountOption): string {
    const ref = a.reference || a.id.slice(0, 8).toUpperCase();
    return `${ref} · ${a.display_name}`;
}

export const AccountSearchInput: React.FC<AccountSearchInputProps> = ({
    value,
    onChange,
    placeholder = 'Search by name, reference…',
    label = 'Account',
    disabled = false,
    types = ACCOUNT_TYPES,
    limit = 200,
    countryCode,
}) => {
    const [accounts, setAccounts] = useState<AccountOption[]>([]);
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(true);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // ── Fetch accounts once ──────────────────────────────────────────────

    useEffect(() => {
        const fetchAccounts = async () => {
            setIsLoading(true);
            try {
                const supabase = createClient();
                const query = supabase
                    .from('accounts')
                    .select('id, reference, display_name, type, country_code')
                    .in('type', types)
                    .eq('status', 'active')
                    .is('deleted_at', null)
                    .order('display_name')
                    .limit(limit);

                if (countryCode) {
                    query.eq('country_code', countryCode);
                }

                const { data } = await query;

                setAccounts(data || []);
            } catch {
                setAccounts([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAccounts();
    }, [types, limit, countryCode]);

    // ── Filtered list ───────────────────────────────────────────────────

    const filtered = useMemo(() => {
        if (!query.trim()) return accounts;
        const q = query.toLowerCase().trim();
        return accounts.filter(a =>
            a.display_name.toLowerCase().includes(q) ||
            (a.reference || '').toLowerCase().includes(q)
        );
    }, [accounts, query]);

    // ── Selected label (shown in the input) ─────────────────────────────

    const selectedAccount = useMemo(
        () => accounts.find(a => a.id === value) || null,
        [accounts, value]
    );

    const retainPlaceholder = useMemo(() => {
        if (value && !selectedAccount) {
            return 'ID: ' + value.slice(0, 8).toUpperCase() + '…';
        }
        return null;
    }, [value, selectedAccount]);

    // ── Set input display when `value` changes externally ────────────────

    useEffect(() => {
        if (selectedAccount && !isOpen) {
            setQuery(buildLabel(selectedAccount));
        } else if (retainPlaceholder && !isOpen && !query) {
            setQuery(retainPlaceholder);
        }
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Click outside — close dropdown ──────────────────────────────────

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                // Reset display to confirmed selection on close
                if (selectedAccount) {
                    setQuery(buildLabel(selectedAccount));
                } else if (retainPlaceholder) {
                    setQuery(retainPlaceholder);
                }
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [selectedAccount, retainPlaceholder]);

    // ── Keyboard navigation ─────────────────────────────────────────────

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => Math.min(prev + 1, filtered.length - 1));
            setIsOpen(true);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => Math.max(prev - 1, 0));
            setIsOpen(true);
        } else if (e.key === 'Enter' && highlightedIndex >= 0 && filtered[highlightedIndex]) {
            e.preventDefault();
            onChange(filtered[highlightedIndex].id);
            setIsOpen(false);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            if (selectedAccount) setQuery(buildLabel(selectedAccount));
        }
    }, [filtered, highlightedIndex, onChange, selectedAccount]);

    // ── Scroll highlighted into view ───────────────────────────────────

    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const el = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightedIndex]);

    const selectAccount = (id: string) => {
        onChange(id);
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
    };

    const inputDisplay = selectedAccount
        ? buildLabel(selectedAccount)
        : query;

    return (
        <div className={styles.wrapper} ref={wrapperRef}>
            {label && <label className={styles.label}>{label}</label>}

            <div className={styles.inputWrapper}>
                <input
                    ref={inputRef}
                    type="text"
                    className={styles.input}
                    placeholder={isLoading ? 'Loading accounts…' : placeholder}
                    value={inputDisplay}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                        setHighlightedIndex(-1);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    aria-label={label}
                />

                {/* Clear pill — only when not disabled */}
                {(query && !disabled) && (
                    <button
                        type="button"
                        className={styles.clearBtn}
                        onClick={() => {
                            setQuery('');
                            onChange('');
                            inputRef.current?.focus();
                        }}
                        aria-label="Clear selection"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* ── Dropdown list ─────────────────────────────────────────── */}

            {isOpen && (
                <div
                    ref={listRef}
                    className={styles.dropdown}
                    role="listbox"
                >
                    {isLoading && (
                        <div className={styles.dropdownItem} style={{ opacity: 0.5, cursor: 'default' }}>
                            Loading accounts…
                        </div>
                    )}

                    {!isLoading && filtered.length === 0 && (
                        <div className={styles.dropdownItem} style={{ opacity: 0.5, cursor: 'default' }}>
                            No accounts match "{query}"
                        </div>
                    )}

                    {!isLoading && filtered.map((a, idx) => (
                        <div
                            key={a.id}
                            role="option"
                            aria-selected={a.id === value}
                            className={`${styles.dropdownItem} ${a.id === value ? styles.dropdownItemSelected : ''} ${idx === highlightedIndex ? styles.dropdownItemHighlighted : ''}`}
                            onClick={() => selectAccount(a.id)}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                        >
                            <span className={styles.accountName}>{a.display_name}</span>
                            <span className={styles.accountMeta}>
                                {a.reference || a.id.slice(0, 8).toUpperCase()}
                                {a.country_code && ` · ${a.country_code}`}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
