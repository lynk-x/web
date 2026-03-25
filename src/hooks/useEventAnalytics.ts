"use client";

/**
 * useEventAnalytics — Lightweight hook for the organizer analytics dashboard.
 *
 * Wraps the `get_event_analytics(p_event_id)` RPC added in the schema review.
 * Returns a single JSONB object with all key event metrics in one round-trip,
 * replacing the previous pattern of assembling 4–6 separate Supabase queries
 * on the client.
 *
 * Metrics returned by the RPC:
 *  - tickets_sold      number   — sum of ticket_tiers.tickets_sold
 *  - total_capacity    number   — sum of ticket_tiers.capacity
 *  - gross_revenue     number   — sum of completed incoming transactions
 *  - waitlist_count    number   — users currently waiting (status='waiting')
 *  - scan_count        number   — successful ticket scan events
 *  - forum_members     number   — forum.member_count
 *
 * @example
 * ```tsx
 * const { analytics, isLoading, error, refresh } = useEventAnalytics(eventId);
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface EventAnalytics {
    tickets_sold: number;
    total_capacity: number;
    gross_revenue: number;
    waitlist_count: number;
    scan_count: number;
    forum_members: number;
}

interface UseEventAnalyticsResult {
    analytics: EventAnalytics | null;
    isLoading: boolean;
    error: string | null;
    /** Re-fetches analytics (e.g. after a ticket sale or scan). */
    refresh: () => void;
}

export function useEventAnalytics(eventId: string | null | undefined): UseEventAnalyticsResult {
    const supabase = useMemo(() => createClient(), []);
    const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    /** Expose an imperative refresh trigger without re-running the effect chain. */
    const refresh = useCallback(() => setTick(t => t + 1), []);

    useEffect(() => {
        if (!eventId) return;

        let cancelled = false;
        setIsLoading(true);
        setError(null);

        (async () => {
            const { data, error: rpcError } = await supabase.rpc('get_event_analytics', {
                p_event_id: eventId,
            });

            if (cancelled) return;

            if (rpcError) {
                setError(rpcError.message);
                setAnalytics(null);
            } else {
                setAnalytics(data as EventAnalytics);
            }
            setIsLoading(false);
        })();

        return () => { cancelled = true; };
    }, [eventId, supabase, tick]);

    return { analytics, isLoading, error, refresh };
}
