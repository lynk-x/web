import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getSafeRedirect } from '@/utils/sanitization'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Validate `next` to prevent open-redirect attacks (absolute URLs and
  // protocol-relative //host URLs are rejected, not just non-'/'-prefixed ones).
  const next = getSafeRedirect(searchParams.get('next'), '/verify-success')

  const supabase = await createClient()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    })

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Session could not be established. Please try again.')}`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      return NextResponse.redirect(`${origin}/verify-success?error=${encodeURIComponent(error.message)}`)
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Safety net: if the session exchange succeeded but getUser returns null
      // (e.g. race condition, token revoked), don't silently redirect to dashboard.
      if (!user) {
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Session could not be established. Please try again.')}`)
      }

      // Intelligent Redirection logic:
      // 1. If 'next' is provided and explicitly different from default, honor it (invites, resets).
      // 2. If no 'next' (default), send user to app home.
      if (next === '/verify-success') {
        return NextResponse.redirect(`${origin}/`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    } else {
      return NextResponse.redirect(`${origin}/verify-success?error=${encodeURIComponent(error.message)}`)
    }
  }

  // If no code or token_hash is present in the URL, redirect to verify-success with error
  return NextResponse.redirect(`${origin}/verify-success?error=Invalid%20or%20missing%20verification%20code`)
}
