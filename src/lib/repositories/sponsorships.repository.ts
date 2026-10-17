/**
 * Sponsorships repository — wraps queries against:
 *   api.v1_sponsorship_tiers, api.v1_sponsorship_invites, api.get_event_sponsorship_overview,
 *   and api.calculate_tier_market_valuation
 *
 * Used by the organizer sponsorships dashboard, tier builder, and direct invitation pipeline.
 */

import type { DbClient, RepoResult } from './types';
import { toError } from './types';

export interface SponsorshipPerks {
    share_of_voice?: number;
    ticket_passes?: number;
    quest_slots?: number;
    formats?: string[];
    [key: string]: unknown;
}

export interface SponsorshipTierItem {
    id: string;
    name: string;
    rank: number;
    price: number;
    currency: string;
    max_slots: number;
    claimed_slots: number;
    perks: SponsorshipPerks;
    is_active: boolean;
}

export interface SponsorshipRosterItem {
    id: string;
    reference: string;
    title: string;
    status: string;
    total_budget: number;
    spent_amount: number;
    currency: string;
    partner_account_id: string;
    partner_name: string;
    tier_id: string;
    tier_name: string;
    details: Record<string, unknown>;
    impressions: number;
    clicks: number;
    created_at: string;
}

export interface SponsorshipInviteItem {
    id: string;
    invite_token: string;
    invitee_email: string;
    invitee_name: string | null;
    company_name: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
    custom_price: number | null;
    currency: string;
    tier_id: string;
    tier_name: string;
    expires_at: string;
    created_at: string;
}

export interface SponsorshipKPIs {
    total_revenue: number;
    in_escrow: number;
    active_sponsors: number;
    slot_utilization_pct: number;
    pipeline_invites: number;
    total_slots: number;
    claimed_slots: number;
}

export interface SponsorshipOverview {
    event_id: string;
    currency: string;
    kpis: SponsorshipKPIs;
    tiers: SponsorshipTierItem[];
    sponsors: SponsorshipRosterItem[];
    invites: SponsorshipInviteItem[];
    timestamp: string;
}

export interface ValuationResult {
    suggested_price: number;
    parity_floor_price: number;
    digital_value: number;
    tangible_value: number;
    activation_value: number;
    currency: string;
    calculated_at: string;
}

export interface UpsertTierParams {
    eventId: string;
    tierId?: string;
    name: string;
    rank?: number;
    price: number;
    currency?: string;
    maxSlots: number;
    perks: SponsorshipPerks;
    isActive?: boolean;
}

export interface CreateInviteParams {
    eventId: string;
    tierId: string;
    companyName: string;
    inviteeEmail: string;
    inviteeName?: string;
    customPrice?: number | null;
    currency?: string;
    expiryDays?: number;
    metadata?: Record<string, unknown>;
}

export interface ClaimInviteEvent {
    id: string;
    reference: string;
    title: string;
    description: string;
    starts_at: string;
    ends_at: string;
    location?: {
        venue?: string;
        address?: string;
        [key: string]: unknown;
    };
    media?: {
        hero?: string;
        poster?: string;
        thumbnail?: string;
        [key: string]: unknown;
    };
    is_online: boolean;
    total_capacity: number;
    organizer_name: string;
    organizer_logo?: string;
}

export interface ClaimInviteTier {
    id: string;
    name: string;
    rank: number;
    catalog_price: number;
    currency: string;
    max_slots: number;
    claimed_slots: number;
    available_slots: number;
    perks: SponsorshipPerks;
    is_active: boolean;
}

export interface ClaimInviteData {
    found: boolean;
    message?: string;
    id: string;
    invite_token: string;
    company_name: string;
    invitee_name: string | null;
    invitee_email: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
    is_expired: boolean;
    expires_at: string;
    custom_price: number | null;
    effective_price: number;
    currency: string;
    event: ClaimInviteEvent;
    tier: ClaimInviteTier;
    metadata?: Record<string, unknown>;
}

export interface AcceptInviteParams {
    inviteToken: string;
    accountId: string;
    campaignTitle?: string;
    destinationUrl?: string;
}

export interface AcceptInviteResult {
    success: boolean;
    invite_id: string;
    campaign_id: string;
    campaign_reference: string;
    status: string;
    event_id: string;
    tier_name: string;
    total_budget: number;
    currency: string;
}

export function createSponsorshipsRepository(client: DbClient) {
    return {
        /**
         * Fetch full sell-side sponsorship overview for an event.
         * Aggregates tier capacity, contracted sponsors, escrow financials, and invite pipeline.
         */
        async getEventOverview(eventId: string): Promise<RepoResult<SponsorshipOverview>> {
            const { data, error } = await client
                .schema('api')
                .rpc('get_event_sponsorship_overview', {
                    p_event_id: eventId,
                });

            if (error) return { data: null, error: toError(error) };
            return { data: data as SponsorshipOverview, error: null };
        },

        /**
         * List configured sponsorship tiers for an event.
         * Filterable by active state and sorted by display rank.
         */
        async listTiers(eventId: string): Promise<RepoResult<SponsorshipTierItem[]>> {
            const { data, error } = await client
                .schema('api')
                .from('v1_sponsorship_tiers')
                .select('*')
                .eq('event_id', eventId)
                .order('rank', { ascending: true });

            if (error) return { data: null, error: toError(error) };
            return { data: (data || []) as unknown as SponsorshipTierItem[], error: null };
        },

        /**
         * List direct sponsor invitations for an event.
         * Sorted by creation date descending.
         */
        async listInvites(eventId: string): Promise<RepoResult<SponsorshipInviteItem[]>> {
            const { data, error } = await client
                .schema('api')
                .from('v1_sponsorship_invites')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });

            if (error) return { data: null, error: toError(error) };
            return { data: (data || []) as unknown as SponsorshipInviteItem[], error: null };
        },

        /**
         * Calculate algorithmic market valuation and yield parity floor for a tier.
         * Evaluates digital reach, tangible pass allocations, and activation perks.
         */
        async calculateMarketValuation(
            eventId: string,
            tierId?: string,
            customPerks?: Record<string, unknown>
        ): Promise<RepoResult<ValuationResult>> {
            const { data, error } = await client
                .schema('api')
                .rpc('calculate_tier_market_valuation', {
                    p_event_id: eventId,
                    p_tier_id: tierId ?? null,
                    p_custom_perks: customPerks ?? {},
                });

            if (error) return { data: null, error: toError(error) };
            return { data: data as ValuationResult, error: null };
        },

        /**
         * Create or update a sponsorship tier package for an event ([P2]).
         * Validates organizer permissions, slot constraints, and updates inventory.
         */
        async upsertTier(params: UpsertTierParams): Promise<RepoResult<SponsorshipTierItem>> {
            const { data, error } = await client
                .schema('api')
                .rpc('upsert_sponsorship_tier', {
                    p_event_id: params.eventId,
                    p_tier_id: params.tierId ?? null,
                    p_name: params.name,
                    p_rank: params.rank ?? 1,
                    p_price: params.price,
                    p_currency: params.currency ?? 'KES',
                    p_max_slots: params.maxSlots,
                    p_perks: params.perks ?? {},
                    p_is_active: params.isActive ?? true,
                });

            if (error) return { data: null, error: toError(error) };
            return { data: data as SponsorshipTierItem, error: null };
        },

        /**
         * Delete an unused sponsorship tier from an event ([P2]).
         * Fails with a descriptive error if active sponsors are attached to the tier.
         */
        async deleteTier(eventId: string, tierId: string): Promise<RepoResult<boolean>> {
            const { data, error } = await client
                .schema('api')
                .rpc('delete_sponsorship_tier', {
                    p_event_id: eventId,
                    p_tier_id: tierId,
                });

            if (error) return { data: null, error: toError(error) };
            return { data: Boolean(data), error: null };
        },

        /**
         * Issue a direct tokenized sponsorship invite for private sponsor outreach ([P3]).
         * Provisions a secure cryptographic token for claiming on the inbound landing route.
         */
        async createInvite(params: CreateInviteParams): Promise<RepoResult<SponsorshipInviteItem>> {
            const { data, error } = await client
                .schema('api')
                .rpc('create_sponsorship_invite', {
                    p_event_id: params.eventId,
                    p_tier_id: params.tierId,
                    p_company_name: params.companyName,
                    p_invitee_email: params.inviteeEmail,
                    p_invitee_name: params.inviteeName ?? null,
                    p_custom_price: params.customPrice ?? null,
                    p_currency: params.currency ?? null,
                    p_expiry_days: params.expiryDays ?? 14,
                    p_metadata: params.metadata ?? {},
                });

            if (error) return { data: null, error: toError(error) };
            return { data: data as SponsorshipInviteItem, error: null };
        },

        /**
         * Revoke an outstanding pending direct sponsorship invite ([P3]).
         * Disables the token from being claimed on the public claim route.
         */
        async revokeInvite(eventId: string, inviteId: string): Promise<RepoResult<boolean>> {
            const { data, error } = await client
                .schema('api')
                .rpc('revoke_sponsorship_invite', {
                    p_event_id: eventId,
                    p_invite_id: inviteId,
                });

            if (error) return { data: null, error: toError(error) };
            return { data: Boolean(data), error: null };
        },

        /**
         * Lookup public sponsorship invitation details using an unguessable 128-bit hex token ([P7]).
         * Callable publicly by prospective corporate sponsors without prior session authentication.
         */
        async getInviteByToken(token: string): Promise<RepoResult<ClaimInviteData>> {
            const { data, error } = await client
                .schema('api')
                .rpc('get_sponsorship_invite_by_token', {
                    p_invite_token: token,
                });

            if (error) return { data: null, error: toError(error) };
            return { data: data as ClaimInviteData, error: null };
        },

        /**
         * Accept a direct sponsorship invitation and atomically provision an advertising campaign ([P7]).
         * Requires authenticated sponsor user who manages the target business account.
         */
        async acceptInvite(params: AcceptInviteParams): Promise<RepoResult<AcceptInviteResult>> {
            const { data, error } = await client
                .schema('api')
                .rpc('accept_sponsorship_invite', {
                    p_invite_token: params.inviteToken,
                    p_account_id: params.accountId,
                    p_campaign_title: params.campaignTitle ?? null,
                    p_destination_url: params.destinationUrl ?? null,
                });

            if (error) return { data: null, error: toError(error) };
            return { data: data as AcceptInviteResult, error: null };
        },

        /**
         * Decline a pending direct sponsorship invitation with optional sponsor feedback ([P7]).
         * Updates invite record to declined status and persists reason in audit metadata.
         */
        async declineInvite(token: string, reason?: string): Promise<RepoResult<boolean>> {
            const { data, error } = await client
                .schema('api')
                .rpc('decline_sponsorship_invite', {
                    p_invite_token: token,
                    p_reason: reason ?? null,
                });

            if (error) return { data: null, error: toError(error) };
            return { data: Boolean(data), error: null };
        },
    };
}

