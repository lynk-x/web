'use server'

import { createAdminClient } from '@/utils/supabase/admin';

export async function processAccountRecovery(email: string, recoveryCode: string, redirectTo?: string) {
    if (!email || !recoveryCode) {
        return { error: 'Email and Recovery Code are required.' };
    }

    try {
        const supabase = createAdminClient();

        // 1. Verify the recovery code cryptographically
        const { data: isValid, error: rpcError } = await supabase.schema('api').rpc('verify_recovery_code', {
            p_email: email.trim(),
            p_recovery_code: recoveryCode.trim()
        });

        if (rpcError) {
            console.error('RPC Error verifying recovery code:', rpcError);
            return { error: 'Invalid recovery code or email.' };
        }

        if (!isValid) {
            return { error: 'Invalid recovery code or email.' };
        }

        // 2. If valid, generate a secure password reset (recovery) link.
        // redirectTo is client-supplied (JSON body) and Supabase's
        // generateLink expects a full URL here rather than a relative path,
        // so guard against an open redirect by requiring it to stay on this
        // site's own origin instead of forwarding it unvalidated.
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
        const safeRedirectTo = redirectTo && siteUrl && redirectTo.startsWith(siteUrl) ? redirectTo : undefined;

        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: email.trim(),
            options: safeRedirectTo ? { redirectTo: safeRedirectTo } : undefined,
        });

        if (linkError || !linkData?.properties?.action_link) {
            console.error('Error generating recovery link:', linkError);
            return { error: 'Failed to generate recovery session.' };
        }

        // 3. Return the secure action link so the frontend can redirect the user
        // This link automatically authenticates them and allows them to reset their password.
        return { url: linkData.properties.action_link };

    } catch (e: any) {
        console.error('Account recovery exception:', e);
        return { error: 'An unexpected error occurred during recovery.' };
    }
}
