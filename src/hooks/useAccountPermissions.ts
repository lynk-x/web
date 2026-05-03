'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface UseAccountPermissionsResult {
    /** True while the initial permission fetch is in flight. */
    loading: boolean;
    /** Returns true if the current user has the given permission slug for accountId. */
    can: (slug: string) => boolean;
    /** Raw permission slug set — useful for rendering permission-gated UI elements. */
    permissions: Set<string>;
    /** Convenience: true if the user's role_slug is 'owner' on this account. */
    isOwner: boolean;
    /** Re-fetch permissions (call after a role change). */
    refresh: () => Promise<void>;
}

/**
 * Resolves the authenticated user's effective permissions for a given account.
 *
 * Fetches once from account_members → account_roles → account_role_permissions
 * via the `get_my_account_permissions` RPC (SECURITY DEFINER, returns text[]).
 * The result is memoised for the lifetime of the component.
 *
 * Usage:
 *   const { can, isOwner, loading } = useAccountPermissions(accountId);
 *   if (can('can_initiate_payouts')) { ... }
 */
export function useAccountPermissions(accountId: string | null | undefined): UseAccountPermissionsResult {
    const [permissions, setPermissions] = useState<Set<string>>(new Set());
    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        if (!accountId) {
            setPermissions(new Set());
            setIsOwner(false);
            return;
        }
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase.rpc('get_my_account_permissions', {
                p_account_id: accountId,
            });
            if (!error && Array.isArray(data)) {
                setPermissions(new Set(data as string[]));
            }
            // Resolve role separately — cheaper than joining in the RPC.
            const { data: member } = await supabase
                .from('account_members')
                .select('role_slug')
                .eq('account_id', accountId)
                .maybeSingle();
            setIsOwner(member?.role_slug === 'owner');
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => { fetch(); }, [fetch]);

    const can = useCallback((slug: string) => permissions.has(slug), [permissions]);

    return { loading, can, permissions, isOwner, refresh: fetch };
}
