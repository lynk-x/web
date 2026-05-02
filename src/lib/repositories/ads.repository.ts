/**
 * Ads repository — wraps queries against:
 *   ad_campaigns, ad_media, ad_campaign_regions, campaign_tags, ad_analytics
 *
 * Used by advertiser dashboard campaign management and admin ads panel.
 */

import type { DbClient, ListOptions, RepoResult, RepoListResult } from './types';
import { toError } from './types';
import type { CampaignStatus } from '@/types/status';

export interface AdCampaign {
    id: string;
    account_id: string;
    title: string;
    description: string;
    type: 'banner' | 'interstitial' | 'interstitial_video';
    status: CampaignStatus;
    start_at: string;
    end_at: string;
    total_budget: number;
    daily_limit?: number;
    spent_amount: number;
    target_url?: string;
    target_event_id?: string;
    target_country_code?: string;
    total_impressions: number;
    total_clicks: number;
    reference?: string;
    created_at: string;
}

export interface AdMedia {
    id: string;
    campaign_id: string;
    media_type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    call_to_action?: string | null;
    is_primary: boolean;
    is_hidden: boolean;
    metadata?: Record<string, unknown>;
    impressions_count: number;
    clicks_count: number;
    created_at: string;
}

/** Per-country bid modifier. The DB stores one row per country; `region` is not modeled here. */
export interface AdCampaignRegion {
    campaign_id: string;
    country_code: string;
    bid_modifier: number;
}

export interface BidSuggestion {
    country_code: string;
    suggested_modifier: number;
    competition_level: 'low' | 'medium' | 'high';
}

export function createAdsRepository(client: DbClient) {
    return {
        /** Fetch all campaigns for an account. */
        async getCampaigns(
            accountId: string,
            opts?: ListOptions & { status?: CampaignStatus }
        ): Promise<RepoListResult<AdCampaign>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            const selectOpts = opts?.withCount ? { count: 'exact' as const } : undefined;
            let query = client
                .from('ad_campaigns')
                .select(
                    'id, account_id, title, description, type, status, start_at, end_at, total_budget, daily_limit, spent_amount, target_url, target_event_id, target_country_code, total_impressions, total_clicks, reference, created_at',
                    selectOpts
                )
                .eq('account_id', accountId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (opts?.status) query = query.eq('status', opts.status);

            const { data, error, count } = await query;
            if (error) return { data: null, total: null, error: toError(error) };
            return { data: data as AdCampaign[], total: count ?? null, error: null };
        },

        /** Fetch a single campaign by ID. */
        async findById(campaignId: string): Promise<RepoResult<AdCampaign | null>> {
            const { data, error } = await client
                .from('ad_campaigns')
                .select('*')
                .eq('id', campaignId)
                .maybeSingle();

            if (error) return { data: null, error: toError(error) };
            return { data: data as AdCampaign | null, error: null };
        },

        /** Create a new ad campaign. `description` is NOT NULL in the DB. */
        async create(params: {
            accountId: string;
            title: string;
            description: string;
            type: AdCampaign['type'];
            startAt: string;
            endAt: string;
            totalBudget: number;
            dailyLimit?: number;
            targetUrl?: string;
            targetEventId?: string;
            targetCountryCode?: string;
        }): Promise<RepoResult<AdCampaign>> {
            const { data, error } = await client
                .from('ad_campaigns')
                .insert({
                    account_id: params.accountId,
                    title: params.title,
                    description: params.description,
                    type: params.type,
                    start_at: params.startAt,
                    end_at: params.endAt,
                    total_budget: params.totalBudget,
                    daily_limit: params.dailyLimit,
                    target_url: params.targetUrl,
                    target_event_id: params.targetEventId,
                    target_country_code: params.targetCountryCode,
                    status: 'draft',
                })
                .select()
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as AdCampaign, error: null };
        },

        /** Update a campaign's fields. */
        async update(campaignId: string, fields: Partial<Pick<AdCampaign, 'title' | 'description' | 'start_at' | 'end_at' | 'total_budget' | 'daily_limit' | 'target_url' | 'target_event_id' | 'target_country_code'>>): Promise<RepoResult<AdCampaign>> {
            const { data, error } = await client
                .from('ad_campaigns')
                .update(fields)
                .eq('id', campaignId)
                .select()
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as AdCampaign, error: null };
        },

        /**
         * Change a campaign's status.
         * NOTE: There is no DB-level state machine — flipping `paused → active` from the
         * client could bypass billing checks. Wrap this behind an RPC once one exists.
         */
        async updateStatus(campaignId: string, status: CampaignStatus): Promise<RepoResult<null>> {
            const { error } = await client
                .from('ad_campaigns')
                .update({ status })
                .eq('id', campaignId);

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Fetch all creative assets for a campaign. */
        async getMedia(campaignId: string): Promise<RepoResult<AdMedia[]>> {
            const { data, error } = await client
                .from('ad_media')
                .select('id, campaign_id, media_type, url, call_to_action, is_primary, is_hidden, metadata, impressions_count, clicks_count, created_at')
                .eq('campaign_id', campaignId)
                .eq('is_hidden', false)
                .order('created_at', { ascending: false });

            if (error) return { data: null, error: toError(error) };
            return { data: data as AdMedia[], error: null };
        },

        /** Fetch per-country bid modifiers for a campaign. */
        async getRegions(campaignId: string): Promise<RepoResult<AdCampaignRegion[]>> {
            const { data, error } = await client
                .from('ad_campaign_regions')
                .select('campaign_id, country_code, bid_modifier')
                .eq('campaign_id', campaignId);

            if (error) return { data: null, error: toError(error) };
            return { data: data as AdCampaignRegion[], error: null };
        },

        /**
         * Get bid CPM suggestions for a list of countries. Wraps `get_market_bid_suggestion` RPC.
         * The RPC accepts a country-code array and returns a row per country.
         */
        async getBidSuggestions(countryCodes: string[]): Promise<RepoResult<BidSuggestion[]>> {
            const { data, error } = await client.rpc('get_market_bid_suggestion', {
                p_country_codes: countryCodes,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: (data ?? []) as BidSuggestion[], error: null };
        },

        /**
         * Log an ad impression or click. Wraps `log_ad_interaction` RPC, which takes a single jsonb payload
         * and pushes it onto the `ad_interactions` PGMQ queue for async processing.
         */
        async logInteraction(params: {
            campaignId: string;
            interactionType: 'impression' | 'click' | 'video_view_10' | 'visit_verified';
            userId?: string;
            metadata?: Record<string, unknown>;
        }): Promise<RepoResult<null>> {
            const { error } = await client.rpc('log_ad_interaction', {
                p_payload: {
                    campaign_id: params.campaignId,
                    interaction_type: params.interactionType,
                    user_id: params.userId ?? null,
                    metadata: params.metadata ?? {},
                },
            });

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },
    };
}
