'use server'

import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Mints a Supabase magic-link for a verified ticket buyer and returns its
 * token_hash, so the forum bridge link can carry a real credential instead
 * of a bare, unauthenticated forum_reference. Checkout never establishes a
 * browser session (resolve_or_create_checkout_user runs as anon), so
 * without this the PWA's bridge screen has no session to inherit and
 * api.v1_forums (authenticated-only) denies the anon request.
 *
 * Independently re-verifies (via the service-role client, bypassing RLS)
 * that userId genuinely holds a completed ticket for eventId before minting
 * anything — the caller's own userId is otherwise just an unauthenticated
 * assertion. An earlier version trusted a client-supplied userId outright,
 * and since userId sits in plain view in the confirmation-page URL, that let
 * anyone mint a login for an arbitrary account just by copying that URL or
 * guessing a user id.
 */
export async function mintForumBridgeToken(userId: string, eventId: string) {
    if (!userId || !eventId) {
        return { error: 'A user id and event id are required.' };
    }

    try {
        const supabase = createAdminClient();

        const { data, error: verifyError } = await supabase
            .schema('api')
            .rpc('verify_completed_order', { p_event_id: eventId, p_user_id: userId });
        const row = Array.isArray(data) ? data[0] : data;
        if (verifyError || !row || row.ticket_count <= 0) {
            console.error('mintForumBridgeToken: no completed ticket found for user/event', userId, eventId, verifyError);
            return { error: 'No completed ticket found for this order.' };
        }

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
