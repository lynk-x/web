'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { sanitizeInput, getSafeRedirect } from '@/utils/sanitization'
import { normalizeToE164 } from '@/utils/phone'

export type AuthActionResult = {
    error?: string
    success?: boolean
    redirectTo?: string
}

/**
 * Authenticates an existing user via password using either email or phone.
 *
 * Auto-detects identifier type (e.g., if phone field contains an '@', it treats
 * it as an email address to handle default form state gracefully) and normalizes
 * phone numbers to E.164 format.
 */
export async function login(formData: FormData): Promise<AuthActionResult> {
    const supabase = await createClient()

    let email = formData.get('email') ? sanitizeInput(formData.get('email') as string) : null
    let phone = formData.get('phone') ? sanitizeInput(formData.get('phone') as string) : null
    const password = formData.get('password') as string
    const next = getSafeRedirect(sanitizeInput((formData.get('next') as string) || ''), '/dashboard')

    if (!email && !phone) {
        return { error: 'Please enter an email address or phone number.' }
    }

    if (!password) {
        return { error: 'Please enter your password.' }
    }

    // Auto-detect email vs phone in case user entered an email address into the default phone input or vice-versa
    if (phone && phone.includes('@')) {
        email = phone
        phone = null
    } else if (email && !email.includes('@') && email.match(/^[\d\+\-\s\(\)]+$/)) {
        phone = email
        email = null
    }

    // Normalize national phone number format to E.164 (+254...) if missing leading +
    if (phone && !phone.startsWith('+')) {
        const normalized = normalizeToE164(phone, '+254')
        if (normalized) phone = normalized
    }

    const { error } = await supabase.auth.signInWithPassword(
        phone ? { phone, password } : { email: email!, password }
    )

    if (error) {
        return { error: error.message || 'Could not authenticate user. Please check your credentials.' }
    }

    // Check if MFA is required
    const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (!mfaError && mfaData) {
        if (mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
            return { success: true, redirectTo: `/mfa-challenge?next=${encodeURIComponent(next)}` }
        }
    }

    revalidatePath('/', 'layout')
    return { success: true, redirectTo: next }
}

/**
 * Registers a new user account with email or phone number.
 */
export async function signup(formData: FormData): Promise<AuthActionResult> {
    const supabase = await createClient()

    let email = formData.get('email') ? sanitizeInput(formData.get('email') as string) : null
    let phone = formData.get('phone') ? sanitizeInput(formData.get('phone') as string) : null
    const password = formData.get('password') as string
    const next = getSafeRedirect(sanitizeInput((formData.get('next') as string) || ''), '/dashboard')

    if (!email && !phone) {
        return { error: 'Please enter an email address or phone number.' }
    }

    if (!password || password.length < 6) {
        return { error: 'Password must be at least 6 characters long.' }
    }

    if (phone && phone.includes('@')) {
        email = phone
        phone = null
    } else if (email && !email.includes('@') && email.match(/^[\d\+\-\s\(\)]+$/)) {
        phone = email
        email = null
    }

    if (phone && !phone.startsWith('+')) {
        const normalized = normalizeToE164(phone, '+254')
        if (normalized) phone = normalized
    }

    const { error } = await supabase.auth.signUp(
        phone ? { phone, password } : { email: email!, password }
    )

    if (error) {
        return { error: error.message || 'Could not create account.' }
    }

    revalidatePath('/', 'layout')
    return { success: true, redirectTo: next }
}

export async function resetPassword(formData: FormData): Promise<AuthActionResult> {
    const supabase = await createClient()

    const email = sanitizeInput(formData.get('email') as string)
    if (!email) {
        return { error: 'Please provide your email address.' }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`,
    })

    if (error) {
        return { error: 'Could not send reset email. Please try again.' }
    }

    return { success: true, redirectTo: '/forgot-password?message=Check your email for the reset link' }
}
