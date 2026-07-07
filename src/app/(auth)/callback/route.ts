import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getSafeRedirect } from '@/utils/sanitization'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Validate `next` to prevent open-redirect attacks (absolute URLs and
  // protocol-relative //host URLs are rejected, not just non-'/'-prefixed ones).
  const next = getSafeRedirect(searchParams.get('next'), '/verify-success')

  if (code) {
    const supabase = await createClient()
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
      // 2. If no 'next' (default), this is a PWA attendee verifying their email — send them to the PWA.
      if (next === '/verify-success') {
        return NextResponse.redirect('https://app.lynk-x.app')
      }

      return NextResponse.redirect(`${origin}${next}`)
    } else {
      return NextResponse.redirect(`${origin}/verify-success?error=${encodeURIComponent(error.message)}`)
    }

  }

  // If no code is present in the URL, someone probably just dragged the link incorrectly, or it's a legacy hash
  return NextResponse.redirect(`${origin}/verify-success?error=Invalid%20or%20missing%20verification%20code`)
}
