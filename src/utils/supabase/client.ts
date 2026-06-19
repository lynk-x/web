import { createBrowserClient } from '@supabase/ssr'

export function createClient<SchemaName extends string = 'public'>(schema?: SchemaName) {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        schema ? { db: { schema } } : undefined
    )
}
