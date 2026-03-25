'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import { sanitizeInput } from '@/utils/sanitization'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = sanitizeInput(formData.get('email') as string)
    const password = formData.get('password') as string
    // Honour the ?next= param so checkout and other gates land the user where they wanted.
    const next = sanitizeInput((formData.get('next') as string) || '/dashboard/organize')

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        redirect(`/login?error=Could not authenticate user&next=${encodeURIComponent(next)}`)
    }

    revalidatePath('/', 'layout')
    redirect(next)
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = sanitizeInput(formData.get('email') as string)
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        redirect('/login?error=Could not create account')
    }

    revalidatePath('/', 'layout')
    // Send new users through onboarding so they pick a role and create an account workspace.
    // They will be redirected to the correct dashboard after onboarding completes.
    redirect('/onboarding')
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
