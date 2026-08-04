"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,       // 1 minute — avoids refetch on every navigation
            gcTime: 5 * 60_000,      // 5 minutes — keep cached data in memory
            retry: 1,
            refetchOnWindowFocus: false,
          },
          // Mutations don't inherit the `queries` retry default above. This applies
          // only when a mutation doesn't set its own `retry` — non-idempotent actions
          // (payments, balance deltas, one-shot creates) MUST override with `retry: false`.
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
