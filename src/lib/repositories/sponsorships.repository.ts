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
    };
}
