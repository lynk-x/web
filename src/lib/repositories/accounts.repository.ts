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
    wallet_balance?: number;
    wallet_currency?: string;
    payout_routing?: Record<string, unknown>;
    isPrimary: boolean;
}

export interface AccountWallet {
    id: string;
    account_id: string;
    currency: string;
    balance: number;
    escrow_balance: number;
    updated_at: string;
}

export interface AccountPaymentMethod {
    id: string;
    account_id: string;
    provider: string;
    provider_identity: string;
    is_primary: boolean;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface AccountInvitation {
    id: string;
    account_id: string;
    email: string;
    role_slug: string;
    status: 'pending' | 'accepted' | 'revoked' | 'expired';
    created_at: string;
    expires_at?: string;
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
                        account_wallets (currency, balance)
                    )
                `)
                .eq('user_id', userId);

            if (error) return { data: null, error: toError(error) };

            const memberships: AccountMembership[] = (data ?? [])
            .filter((member: any) => member.accounts != null)
            .map((member: any) => {
                const wallets: { currency: string; balance: number }[] =
                    member.accounts.account_wallets ?? [];
                const primaryWallet =
                    wallets.find((w) => w.currency === 'KES') ?? wallets[0];

                return {
                    id: member.accounts.id,
                    slug: member.accounts.slug,
                    name: member.accounts.display_name,
                    logoUrl: (member.accounts.media as any)?.logo ?? undefined,
                    role: member.role_slug,
                    type: member.accounts.type,
                    wallet_balance: primaryWallet ? Number(primaryWallet.balance) : 0,
                    wallet_currency: primaryWallet?.currency ?? 'KES',
                    payout_routing: member.accounts.payout_routing ?? {},
                    isPrimary: member.is_primary,
                };
            }).sort((a, b) => (a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1));

            return { data: memberships, error: null };
        },

        /** Fetch all wallets for an account. */
        async getWallets(accountId: string): Promise<RepoResult<AccountWallet[]>> {
            const { data, error } = await client
                .from('account_wallets')
                .select('id, account_id, currency, balance, escrow_balance, updated_at')
                .eq('account_id', accountId);

            if (error) return { data: null, error: toError(error) };
            return { data: data as AccountWallet[], error: null };
        },

        /** Fetch all stored payment methods for an account. */
        async getPaymentMethods(accountId: string): Promise<RepoResult<AccountPaymentMethod[]>> {
            const { data, error } = await client
                .from('account_payment_methods')
                .select('id, account_id, provider, provider_identity, is_primary, metadata, created_at, updated_at')
                .eq('account_id', accountId)
                .order('is_primary', { ascending: false });

            if (error) return { data: null, error: toError(error) };
            return { data: data as AccountPaymentMethod[], error: null };
        },

        /** Fetch pending invitations for an account. */
        async getInvitations(accountId: string, opts?: ListOptions): Promise<RepoResult<AccountInvitation[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            const { data, error } = await client
                .from('account_invitations')
                .select('id, account_id, email, role_slug, status, created_at, expires_at')
                .eq('account_id', accountId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };
            return { data: data as AccountInvitation[], error: null };
        },

        /** Create a new member invitation. Wraps `create_account_invitation` RPC. */
        async createInvitation(params: {
            accountId: string;
            email: string;
            role: string;
        }): Promise<RepoResult<null>> {
            const { error } = await client.rpc('create_account_invitation', {
                p_account_id: params.accountId,
                p_email: params.email,
                p_role: params.role,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Revoke a pending invitation. Wraps `revoke_account_invitation` RPC. */
        async revokeInvitation(invitationId: string): Promise<RepoResult<null>> {
            const { error } = await client.rpc('revoke_account_invitation', {
                p_invitation_id: invitationId,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Accept an invitation. Wraps `accept_account_invitation` RPC. */
        async acceptInvitation(invitationId: string): Promise<RepoResult<null>> {
            const { error } = await client.rpc('accept_account_invitation', {
                p_invitation_id: invitationId,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Create a new organization account. Wraps `create_organization_account` RPC. */
        async createOrganization(params: {
            accountType: string;
            displayName: string;
        }): Promise<RepoResult<{ id: string }>> {
            const { data, error } = await client.rpc('create_organization_account', {
                p_account_type: params.accountType,
                p_display_name: params.displayName,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: data as { id: string }, error: null };
        },
    };
}
