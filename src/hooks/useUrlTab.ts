"use client";

import { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface UseUrlTabOptions {
    /** 'push' adds a history entry per tab switch; 'replace' (default) does not. */
    mode?: 'push' | 'replace';
    /** If given, an initial URL value outside this list falls back to defaultTab instead of being used as-is. */
    validValues?: readonly string[];
}

/**
 * Tab state synced to a URL query param, so the active tab survives reloads
 * and is shareable/bookmarkable. Requires the page to be wrapped in <Suspense>
 * since it reads useSearchParams.
 */
export function useUrlTab(paramName: string, defaultTab: string, options: UseUrlTabOptions = {}): [string, (value: string) => void] {
    const { mode = 'replace', validValues } = options;
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialValue = searchParams.get(paramName) || defaultTab;
    const [activeTab, setActiveTab] = useState(
        validValues && !validValues.includes(initialValue) ? defaultTab : initialValue
    );

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        const params = new URLSearchParams(searchParams.toString());
        params.set(paramName, value);
        const url = `${pathname}?${params.toString()}`;
        if (mode === 'push') {
            router.push(url);
        } else {
            router.replace(url);
        }
    };

    return [activeTab, handleTabChange];
}
