'use server'

import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Mints a Supabase magic-link for the checkout-resolved buyer and returns
 * its token_hash, so the forum bridge link can carry a real credential
 * instead of a bare, unauthenticated forum_reference. Checkout never
 * establishes a browser session (resolve_or_create_checkout_user runs as
 * anon), so without this the PWA's bridge screen has no session to inherit
 * and api.v1_forums (authenticated-only) denies the anon request outright.
 */
export async function mintForumBridgeToken(userId: string) {
    if (!userId) {
        return { error: 'A user id is required.' };
    }

    try {
        const supabase = createAdminClient();

        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (userError || !userData?.user?.email) {
            console.error('mintForumBridgeToken: failed to resolve email for user', userId, userError);
            return { error: 'Could not resolve an email for this account.' };
        }

        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: userData.user.email,
        });

        if (linkError || !linkData?.properties?.hashed_token) {
            console.error('mintForumBridgeToken: generateLink failed', linkError);
            return { error: 'Failed to generate a forum access link.' };
        }

        return { tokenHash: linkData.properties.hashed_token };

    } catch (e: any) {
        console.error('mintForumBridgeToken exception:', e);
        return { error: 'An unexpected error occurred.' };
    }
}
