/**
 * Cookie-free public Supabase client for Next.js static generation and ISR.
 *
 * Uses `@supabase/supabase-js` directly instead of `@supabase/ssr` (which calls
 * `cookies()` and forces every caller route into uncached dynamic SSR). Only use
 * for anonymous, public-safe queries such as `vw_events`, `api.v1_event_detail`,
 * `api.v1_event_categories`, `api.v1_cms_pages` and `api.v1_legal_documents`.
 */
import { createClient } from '@supabase/supabase-js';

export function createPublicClient() {
    const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    );

    // Automatically route v1_ views to the api schema to match server.ts.
    const originalFrom = client.from.bind(client);
    client.from = function (relation: string) {
        if (relation.startsWith('v1_')) {
            return client.schema('api').from(relation);
        }
        return originalFrom(relation);
    };

    return client;
}
