/**
 * Accounts repository — wraps queries against:
 *   accounts, account_members, account_wallets, account_payment_methods,
 *   account_invitations, business_profile
 *
 * Used by OrganizationContext, onboarding, and team management pages.
 */

import type { DbClient, ListOptions, RepoResult } from './types';
import { toError } from './types';

export interface AccountMembership {
    id: string;
    slug?: string;
    name: string;
    logoUrl?: string;
    role: string;
    type: 'attendee' | 'organizer' | 'advertiser' | 'platform';
    /** Account default currency (from accounts.country_code → countries.currency). */
    currency?: string;
    wallet_balance?: number;
    wallet_currency?: string;
    payout_routing?: Record<string, unknown>;
    isPrimary: boolean;
}

export interface AccountWallet {
    id: string;
    account_id: string;
    reference: string;
    currency: string;
    balance: number;
    escrow_balance: number;
    updated_at: string;
}

/**
 * Account payment method as exposed to the UI. The DB stores a `provider_id` FK;
 * this shape flattens the joined provider name for convenience.
 */
export interface AccountPaymentMethod {
    id: string;
    account_id: string;
    provider_id: string;
    provider_name: string;
    provider_display_name: string;
    provider_identity: string;
    is_primary: boolean;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

/**
 * Invitation lifecycle is implicit on the DB side:
 *   accepted_at IS NOT NULL → 'accepted'
 *   expires_at < now()      → 'expired'
 *   else                    → 'pending'
 */
export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export interface AccountInvitation {
    id: string;
    account_id: string;
    invitee_email: string | null;
    invitee_phone: string | null;
    role_slug: string;
    accepted_at: string | null;
    expires_at: string;
    created_at: string;
    /** Computed client-side from accepted_at and expires_at. */
    status: InvitationStatus;
}

function deriveInvitationStatus(row: { accepted_at: string | null; expires_at: string }): InvitationStatus {
    if (row.accepted_at) return 'accepted';
    if (new Date(row.expires_at).getTime() < Date.now()) return 'expired';
    return 'pending';
}

export function createAccountsRepository(client: DbClient) {
    return {
        /**
         * Fetch all accounts the user is a member of, with wallet data.
         * Used by OrganizationContext on mount.
         */
        async getMembershipsForUser(userId: string): Promise<RepoResult<AccountMembership[]>> {
            const { data, error } = await client
                .from('account_members')
                .select(`
                    role_slug,
                    is_primary,
                    accounts:account_id (
                        id,
                        slug,
                        display_name,
                        type,
                        media,
                        payout_routing,
                        country_code,
                        countries:country_code (currency),
                        account_wallets (currency, balance, reference)
                    )
                `)
                .eq('user_id', userId);

            if (error) return { data: null, error: toError(error) };

            const memberships: AccountMembership[] = (data ?? [])
                .filter((member: any) => member.accounts != null)
                .map((member: any) => {
                    const accountCurrency: string | undefined = member.accounts.countries?.currency;
                    const wallets: { currency: string; balance: number }[] =
                        member.accounts.account_wallets ?? [];
                    const primaryWallet =
                        (accountCurrency ? wallets.find((w) => w.currency === accountCurrency) : undefined) ?? wallets[0];

                    return {
                        id: member.accounts.id,
                        slug: member.accounts.slug,
                        name: member.accounts.display_name,
                        logoUrl: (member.accounts.media as any)?.logo ?? undefined,
                        role: member.role_slug,
                        type: member.accounts.type,
                        currency: accountCurrency,
                        wallet_balance: primaryWallet ? Number(primaryWallet.balance) : 0,
                        wallet_currency: primaryWallet?.currency ?? accountCurrency ?? 'USD',
                        payout_routing: member.accounts.payout_routing ?? {},
                        isPrimary: member.is_primary,
                    };
                })
                .sort((a, b) => (a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1));

            return { data: memberships, error: null };
        },

        /** Fetch all wallets for an account. */
        async getWallets(accountId: string): Promise<RepoResult<AccountWallet[]>> {
            const { data, error } = await client
                .from('account_wallets')
                .select('reference, account_id, currency, balance, escrow_balance, updated_at')
                .eq('account_id', accountId);

            if (error) return { data: null, error: toError(error) };
            
            // Map reference to id for DataTable compatibility
            const mappedData = (data ?? []).map((row: any) => ({
                ...row,
                id: row.reference
            }));

            return { data: mappedData as AccountWallet[], error: null };
        },

        /** Fetch all stored payment methods for an account, with provider names joined. */
        async getPaymentMethods(accountId: string): Promise<RepoResult<AccountPaymentMethod[]>> {
            const { data, error } = await client
                .from('account_payment_methods')
                .select(`
                    id, account_id, provider_id, provider_identity, is_primary, metadata, created_at, updated_at,
                    platform_payment_providers:provider_id (provider_name, display_name)
                `)
                .eq('account_id', accountId)
                .order('is_primary', { ascending: false });

            if (error) return { data: null, error: toError(error) };

            const methods: AccountPaymentMethod[] = (data ?? []).map((row: any) => ({
                id: row.id,
                account_id: row.account_id,
                provider_id: row.provider_id,
                provider_name: row.platform_payment_providers?.provider_name ?? '',
                provider_display_name: row.platform_payment_providers?.display_name ?? '',
                provider_identity: row.provider_identity,
                is_primary: row.is_primary,
                metadata: row.metadata,
                created_at: row.created_at,
                updated_at: row.updated_at,
            }));

            return { data: methods, error: null };
        },

        /** Fetch invitations for an account with derived `status`. */
        async getInvitations(accountId: string, opts?: ListOptions): Promise<RepoResult<AccountInvitation[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            const { data, error } = await client
                .from('account_invitations')
                .select('id, account_id, invitee_email, invitee_phone, role_slug, accepted_at, expires_at, created_at')
                .eq('account_id', accountId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };

            const invitations: AccountInvitation[] = (data ?? []).map((row: any) => ({
                ...row,
                status: deriveInvitationStatus(row),
            }));

            return { data: invitations, error: null };
        },

        /**
         * Create a new member invitation. Wraps `create_account_invitation` RPC.
         * RPC must validate caller is account admin/owner, generate the token,
         * set expires_at, and (out-of-band) trigger the invitation email.
         */
        async createInvitation(params: {
            accountId: string;
            email?: string;
            phone?: string;
            roleSlug: string;
        }): Promise<RepoResult<{ invitation_id: string; token: string }>> {
            const { data, error } = await client.rpc('create_account_invitation', {
                p_account_id: params.accountId,
                p_invitee_email: params.email ?? null,
                p_invitee_phone: params.phone ?? null,
                p_role_slug: params.roleSlug,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: data as { invitation_id: string; token: string }, error: null };
        },

        /** Revoke a pending invitation. Wraps `revoke_account_invitation` RPC. */
        async revokeInvitation(invitationId: string): Promise<RepoResult<null>> {
            const { error } = await client.rpc('revoke_account_invitation', {
                p_invitation_id: invitationId,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /**
         * Accept an invitation. Wraps `accept_account_invitation` RPC.
         * Caller must be authenticated and their email/phone must match the invitee
         * recorded on the invitation row (verified server-side).
         */
        async acceptInvitation(token: string): Promise<RepoResult<{ account_id: string }>> {
            const { data, error } = await client.rpc('accept_account_invitation', {
                p_token: token,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: data as { account_id: string }, error: null };
        },

        /** Create a new organization account. Wraps `create_organization_account` RPC. */
        async createOrganization(params: {
            orgName: string;
            contactEmail?: string;
            accountType?: 'organizer' | 'advertiser';
        }): Promise<RepoResult<{ account_id: string }>> {
            const { data, error } = await client.rpc('create_organization_account', {
                p_org_name: params.orgName,
                p_contact_email: params.contactEmail ?? null,
                p_account_type: params.accountType ?? 'organizer',
            });

            if (error) return { data: null, error: toError(error) };
            // RPC returns a uuid — wrap in a stable object shape for callers.
            return { data: { account_id: data as string }, error: null };
        },
    };
}
