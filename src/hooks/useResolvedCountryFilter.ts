"use client";

import { useMemo } from 'react';

interface AccountLike {
    type?: string;
    country_code?: string | null;
}

/**
 * Resolves the country scope an admin page should filter by, honoring the
 * platform-admin "proxy country" override stored in localStorage.
 * Falls back to the active account's own country, then to `fallback`.
 */
export function useResolvedCountryFilter(activeAccount: AccountLike | null | undefined, fallback: string = 'all'): string {
    return useMemo(() => {
        if (typeof window !== 'undefined' && activeAccount?.type === 'platform') {
            const proxyCode = localStorage.getItem('lynks_proxy_country_code');
            if (proxyCode) return proxyCode;
        }
        if (activeAccount?.country_code) {
            return activeAccount.country_code;
        }
        return fallback;
    }, [activeAccount, fallback]);
}
