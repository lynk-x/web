import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // Follow the 'next' redirect if provided (e.g. from password resets), otherwise default to email verified
  const next = searchParams.get('next') ?? '/verify-success'

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
      // 2. If no 'next' (default), check if user is a new user with only an 'attendee' account.
      // 3. If new, send to onboarding. Else, send to dashboard.
      let finalRedirect = next
      
      if (next === '/verify-success' && user) {
        finalRedirect = '/dashboard'
      }

      return NextResponse.redirect(`${origin}${finalRedirect}`)
    } else {
      return NextResponse.redirect(`${origin}/verify-success?error=${encodeURIComponent(error.message)}`)
    }

  }

  // If no code is present in the URL, someone probably just dragged the link incorrectly, or it's a legacy hash
  return NextResponse.redirect(`${origin}/verify-success?error=Invalid%20or%20missing%20verification%20code`)
}
