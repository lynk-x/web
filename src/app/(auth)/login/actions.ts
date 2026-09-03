'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import { sanitizeInput, getSafeRedirect } from '@/utils/sanitization'

/**
 * Authenticates an existing user via password using either email or phone.
 *
 * Auto-detects identifier type (e.g., if phone field contains an '@', it treats
 * it as an email address to handle default form state gracefully).
 */
export async function login(formData: FormData) {
    const supabase = await createClient()

    let email = formData.get('email') ? sanitizeInput(formData.get('email') as string) : null
    let phone = formData.get('phone') ? sanitizeInput(formData.get('phone') as string) : null
    const password = formData.get('password') as string
    // Honour the ?next= param so checkout and other gates land the user where they wanted.
    const next = getSafeRedirect(sanitizeInput((formData.get('next') as string) || ''), '/dashboard')

    // Auto-detect email vs phone in case user entered an email address into the default phone input or vice-versa
    if (phone && phone.includes('@')) {
        email = phone
        phone = null
    } else if (email && !email.includes('@') && email.match(/^[\d\+\-\s\(\)]+$/)) {
        phone = email
        email = null
    }

    const { data, error } = await supabase.auth.signInWithPassword(
        phone ? { phone, password } : { email: email!, password }
    )

    if (error) {
        const errorMsg = error.message || 'Could not authenticate user'
        redirect(`/login?error=${encodeURIComponent(errorMsg)}&next=${encodeURIComponent(next)}`)
    }

    // Check if MFA is required
    const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!mfaError && mfaData) {
        if (mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
            // User needs to complete MFA challenge before accessing the dashboard
            redirect(`/mfa-challenge?next=${encodeURIComponent(next)}`);
        }
    }

    revalidatePath('/', 'layout')
    redirect(next)
}

/**
 * Registers a new user account with email or phone number.
 */
export async function signup(formData: FormData) {
    const supabase = await createClient()

    let email = formData.get('email') ? sanitizeInput(formData.get('email') as string) : null
    let phone = formData.get('phone') ? sanitizeInput(formData.get('phone') as string) : null
    const password = formData.get('password') as string
    const next = getSafeRedirect(sanitizeInput((formData.get('next') as string) || ''), '/dashboard')

    if (phone && phone.includes('@')) {
        email = phone
        phone = null
    } else if (email && !email.includes('@') && email.match(/^[\d\+\-\s\(\)]+$/)) {
        phone = email
        email = null
    }

    const { error } = await supabase.auth.signUp(
        phone ? { phone, password } : { email: email!, password }
    )

    if (error) {
        const errorMsg = error.message || 'Could not create account'
        redirect(`/login?error=${encodeURIComponent(errorMsg)}&next=${encodeURIComponent(next)}`)
    }

    revalidatePath('/', 'layout')
    // Send new users to the intended destination (usually dashboard, which handles onboarding redirect)
    redirect(next)
}

export async function resetPassword(formData: FormData) {
    const supabase = await createClient()

    const email = sanitizeInput(formData.get('email') as string)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // FIX: was '/account/update-password' which 404s — correct route is /update-password
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`,
    })

    if (error) {
        redirect('/forgot-password?error=Could not send reset email')
    }

    redirect('/forgot-password?message=Check your email for the reset link')
}
