import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

/**
 * Checks a single feature flag from the `feature_flags` table.
 *
 * Returns `{ enabled: boolean | null, isLoading: boolean }`.
 * `enabled` is `null` while the check is in-flight, `true`/`false` once resolved.
 * Unknown flags default to `false`.
 */
export function useFeatureFlag(key: string): { enabled: boolean | null; isLoading: boolean } {
    const supabase = useMemo(() => createClient(), []);
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const check = async () => {
            try {
                const { data } = await supabase
                    .from('feature_flags')
                    .select('is_enabled')
                    .eq('key', key)
                    .single();
                if (!cancelled) setEnabled(data?.is_enabled === true);
            } catch {
                if (!cancelled) setEnabled(false);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        check();
        return () => { cancelled = true; };
    }, [key, supabase]);

    return { enabled, isLoading };
}
