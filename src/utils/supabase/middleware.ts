import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.
    const { data: { user } } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl

    // ── Protect authenticated routes ───────────────────────────────────────
    const protectedRoutes = ['/dashboard', '/onboarding', '/setup-profile']
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        // Forward the current path as ?next= so login() can redirect back.
        url.searchParams.set('next', pathname + request.nextUrl.search)
        return NextResponse.redirect(url)
    }

    // ── Admin route guard ──────────────────────────────────────────────────
    // Non-admin users attempting to access /dashboard/admin are redirected.
    // Full role verification happens in RLS — this just prevents the shell from rendering.
    if (user && pathname.startsWith('/dashboard/admin')) {
        const { data: membership, error } = await supabase
            .from('account_members')
            .select('id, accounts:account_id!inner(type)')
            .eq('user_id', user.id)
            .eq('accounts.type', 'platform')
            .maybeSingle()

        if (error) {
            console.error('[Middleware] Admin check error:', error)
        }

        if (!membership) {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
