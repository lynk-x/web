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
    const protectedRoutes = ['/dashboard', '/onboarding', '/setup-profile', '/complete-contact-info', '/account']
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        // Forward the current path as ?next= so login() can redirect back.
        url.searchParams.set('next', pathname + request.nextUrl.search)
        return NextResponse.redirect(url)
    }

    // ── Contact info guard ──────────────────────────────────────────────────
    // Runs ahead of every other gate below: accounts that predate OTP-based
    // auth (password/Google signups that only ever collected one identifier)
    // must add whichever of email/phone is missing before doing anything
    // else, since OTP login depends on both eventually being on file.
    if (user && (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding') || pathname.startsWith('/setup-profile'))) {
        const { data: hasContactInfo, error } = await supabase.schema('api').rpc('user_has_contact_info')

        if (error) {
            console.error('[Middleware] user_has_contact_info RPC error:', error)
        }

        if (!error && !hasContactInfo) {
            const url = request.nextUrl.clone()
            url.pathname = '/complete-contact-info'
            url.searchParams.set('next', pathname + request.nextUrl.search)
            return NextResponse.redirect(url)
        }
    }

    // ── Profile setup guard ─────────────────────────────────────────────────
    // A brand-new sign-up must set up their profile (full_name) before doing
    // anything else — including creating a workspace — so this runs ahead of
    // the onboarding guard below and also covers /onboarding itself.
    if (user && (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding'))) {
        const { data: hasProfile, error } = await supabase.schema('api').rpc('user_has_complete_profile')

        if (error) {
            console.error('[Middleware] user_has_complete_profile RPC error:', error)
        }

        if (!error && !hasProfile) {
            const url = request.nextUrl.clone()
            url.pathname = '/setup-profile'
            return NextResponse.redirect(url)
        }
    }

    // ── Onboarding guard ────────────────────────────────────────────────────
    // A session with no account yet (e.g. signed up via login/OAuth, which
    // no longer auto-provisions an attendee account) must finish onboarding
    // before reaching the dashboard.
    if (user && pathname.startsWith('/dashboard')) {
        const { data: hasAccount, error } = await supabase.schema('api').rpc('user_has_any_account')

        if (error) {
            console.error('[Middleware] user_has_any_account RPC error:', error)
        }

        if (!error && !hasAccount) {
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding'
            return NextResponse.redirect(url)
        }
    }

    // ── Admin route guard ──────────────────────────────────────────────────
    // Non-admin users attempting to access /dashboard/admin are redirected.
    // Full role verification happens in RLS — this just prevents the shell from rendering.
    if (user && pathname.startsWith('/dashboard/admin')) {
        // Use the built-in RPC for a clean, server-side admin check.
        // This avoids complex join syntax issues in the middleware.
        const { data: isAdmin, error } = await supabase.schema('api').rpc('is_system_admin')

        if (error) {
            console.error('[Middleware] Admin RPC check error:', error)
        }

        if (!isAdmin) {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
