import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

/**
 * Next.js Proxy — Route Protection & Session Hydration
 *
 * This proxy runs on every matched request BEFORE the page renders.
 * Performs two jobs in one pass:
 *
 * 1. SESSION REFRESH — calls `updateSession()` which uses the Supabase SSR
 *    client to read and rewrite auth cookies so that server-side
 *    `supabase.auth.getUser()` calls always see a fresh JWT.
 *
 * 2. RBAC ROUTE GUARD — `updateSession()` redirects unauthenticated users
 *    away from /dashboard/* to /login. Admin role checks happen inside
 *    the dashboard layouts via server-side `getUser()`.
 *
 * The `matcher` config excludes static assets and Next.js internals for
 * performance — proxy only runs on routes that need auth context.
 *
 * NOTE: In Next.js 16+, this file MUST be named `proxy.ts` (at src/ or
 * project root) and export a function named `proxy`. The older `middleware.ts`
 * convention is deprecated in this version.
 */
export async function proxy(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         *  - _next/static  (static files)
         *  - _next/image   (image optimization)
         *  - favicon.ico   (browser icon)
         *  - Public assets (svg, png, jpg, webp, ico, font files)
         *
         * This ensures the proxy runs for all page routes and API routes
         * while skipping static file serving for maximum performance.
         */
        '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)).*)',
    ],
};
