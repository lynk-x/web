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
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      return NextResponse.redirect(`${origin}/verify-success?error=${encodeURIComponent(error.message)}`)
    }
  }

  // If no code is present in the URL, someone probably just dragged the link incorrectly, or it's a legacy hash
  return NextResponse.redirect(`${origin}/verify-success?error=Invalid%20or%20missing%20verification%20code`)
}
