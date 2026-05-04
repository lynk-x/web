"use client";

import { useQuery, UseQueryOptions, QueryKey } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

type Fetcher<T> = (supabase: SupabaseClient) => Promise<T>;

/**
 * Thin wrapper around useQuery that supplies the Supabase client.
 *
 * Usage:
 *   const { data, isLoading } = useSupabaseQuery(
 *     ['events', accountId],
 *     (sb) => sb.from('events').select('*').eq('account_id', accountId).throwOnError().then(r => r.data ?? []),
 *   );
 *
 * The fetcher must throw on error (use .throwOnError() or throw manually) so
 * TanStack Query can handle retries and error state correctly.
 */
export function useSupabaseQuery<T>(
  queryKey: QueryKey,
  fetcher: Fetcher<T>,
  options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">
) {
  const supabase = useMemo(() => createClient(), []);

  return useQuery<T, Error>({
    queryKey,
    queryFn: () => fetcher(supabase),
    ...options,
  });
}
