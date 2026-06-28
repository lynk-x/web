import { createBrowserClient } from '@supabase/ssr'

export function createClient<SchemaName extends string = 'public'>(schema?: SchemaName) {
    const client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        schema ? { db: { schema } } : undefined
    )

    // Automatically route v1_ views to the api schema if no schema was explicitly set
    if (!schema) {
        const originalFrom = client.from.bind(client);
        client.from = function(relation: string) {
            if (relation.startsWith('v1_')) {
                return client.schema('api').from(relation);
            }
            return originalFrom(relation);
        };
    }

    return client;
}
