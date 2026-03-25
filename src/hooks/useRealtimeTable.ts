"use client";

/**
 * useRealtimeTable — Generic Supabase Realtime subscription hook.
 *
 * Encapsulates the full subscription lifecycle (subscribe → apply change → cleanup)
 * for any public table, eliminating the ~40-line boilerplate that was duplicated
 * across forum, notifications, and ticket screens.
 *
 * Features:
 * - Supports INSERT, UPDATE, DELETE, and wildcard (*) event types
 * - Optional row-level filter (e.g., `event_id=eq.${id}`)
 * - Stable channel name prevents duplicate subscriptions on re-renders
 * - Automatically unsubscribes on component unmount
 *
 * @example — Live notification badge
 * ```tsx
 * const { rows } = useRealtimeTable<Notification>({
 *   table: 'notifications',
 *   filter: `user_id=eq.${userId}`,
 *   event: 'INSERT',
 *   initialRows: [],
 *   onInsert: (row) => toast(row.title),
 * });
 * ```
 *
 * @example — Live ticket scan log during event
 * ```tsx
 * const { rows } = useRealtimeTable<ScanLog>({
 *   table: 'ticket_scan_logs',
 *   filter: `event_id=eq.${eventId}`,
 *   event: '*',
 * });
 * ```
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeTableOptions<T extends Record<string, unknown>> {
  /** Supabase table name to subscribe to. */
  table: string;

  /** Optional row-level PostgREST filter string, e.g. `event_id=eq.${id}`. */
  filter?: string;

  /** Which DML event(s) to subscribe to. Defaults to '*' (all). */
  event?: RealtimeEvent;

  /** Initial state for the row collection. Defaults to []. */
  initialRows?: T[];

  /**
   * Custom merge strategy. If not provided, the hook uses sensible defaults:
   * - INSERT: prepend new row
   * - UPDATE: replace by `id` field (falls back to full-list refresh)
   * - DELETE: remove by `old.id` field
   */
  onInsert?: (row: T, current: T[]) => T[];
  onUpdate?: (row: T, current: T[]) => T[];
  onDelete?: (old: Partial<T>, current: T[]) => T[];
}

interface UseRealtimeTableResult<T> {
  /** Current list of rows, kept in sync with the database via realtime. */
  rows: T[];

  /** Manually override rows (useful when initial server data arrives). */
  setRows: React.Dispatch<React.SetStateAction<T[]>>;

  /** True while the subscription is connecting. */
  isConnecting: boolean;

  /** Non-null if the subscription encountered an error. */
  error: string | null;
}

export function useRealtimeTable<T extends Record<string, unknown>>(
  options: UseRealtimeTableOptions<T>
): UseRealtimeTableResult<T> {
  const {
    table,
    filter,
    event = '*',
    initialRows = [],
    onInsert,
    onUpdate,
    onDelete,
  } = options;

  const [rows, setRows] = useState<T[]>(initialRows);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable ref to avoid stale closure inside the subscription callback
  const rowsRef = useRef<T[]>(rows);
  rowsRef.current = rows;

  // Derive a stable channel name from the subscription parameters
  const channelName = `rt_${table}${filter ? `_${filter}` : ''}_${event}`;

  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<T>) => {
      const current = rowsRef.current;

      if (payload.eventType === 'INSERT') {
        const newRow = payload.new as T;
        setRows(onInsert ? onInsert(newRow, current) : [newRow, ...current]);
      } else if (payload.eventType === 'UPDATE') {
        const updated = payload.new as T;
        setRows(
          onUpdate
            ? onUpdate(updated, current)
            : current.map((r) => ((r as { id?: unknown }).id === (updated as { id?: unknown }).id ? updated : r))
        );
      } else if (payload.eventType === 'DELETE') {
        const old = payload.old as Partial<T>;
        setRows(
          onDelete
            ? onDelete(old, current)
            : current.filter((r) => (r as { id?: unknown }).id !== (old as { id?: unknown }).id)
        );
      }
    },
    [onInsert, onUpdate, onDelete]
  );

  useEffect(() => {
    const supabase = createClient();
    setIsConnecting(true);
    setError(null);

    const channelConfig = filter
      ? { event, schema: 'public', table, filter }
      : { event, schema: 'public', table };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase.channel(channelName) as any)
      .on('postgres_changes', channelConfig, handleChange)
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') setIsConnecting(false);
        if (status === 'CHANNEL_ERROR') {
          setError(`Realtime subscription failed for table "${table}"`);
          setIsConnecting(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, event, channelName, handleChange]);

  return { rows, setRows, isConnecting, error };
}
