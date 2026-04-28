'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import { sanitizeInput } from '@/utils/sanitization'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') ? sanitizeInput(formData.get('email') as string) : null
    const phone = formData.get('phone') ? sanitizeInput(formData.get('phone') as string) : null
    const password = formData.get('password') as string
    // Honour the ?next= param so checkout and other gates land the user where they wanted.
    const next = sanitizeInput((formData.get('next') as string) || '/dashboard')

    const { error } = await supabase.auth.signInWithPassword(
        phone ? { phone, password } : { email: email!, password }
    )

    if (error) {
        const errorMsg = error.message || 'Could not authenticate user'
        redirect(`/login?error=${encodeURIComponent(errorMsg)}&next=${encodeURIComponent(next)}`)
    }

    revalidatePath('/', 'layout')
    redirect(next)
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') ? sanitizeInput(formData.get('email') as string) : null
    const phone = formData.get('phone') ? sanitizeInput(formData.get('phone') as string) : null
    const password = formData.get('password') as string
    const next = sanitizeInput((formData.get('next') as string) || '/dashboard')

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
