/**
 * Ads repository — wraps queries against:
 *   ad_campaigns, ad_assets, ad_campaign_regions, campaign_tags, ad_analytics
 *
 * Used by advertiser dashboard campaign management and admin ads panel.
 */

import type { DbClient, ListOptions, RepoResult } from './types';
import { toError } from './types';
import type { CampaignStatus, GeographicRegion } from '@/types/status';

export interface AdCampaign {
    id: string;
    account_id: string;
    title: string;
    type: 'banner' | 'interstitial' | 'interstitial_video';
    status: CampaignStatus;
    start_at: string;
    end_at: string;
    total_budget: number;
    daily_limit?: number;
    spent_amount: number;
    target_url: string;
    target_event_id?: string;
    target_country_code?: string;
    total_impressions: number;
    total_clicks: number;
    reference?: string;
    created_at: string;
}

export interface AdAsset {
    id: string;
    campaign_id: string;
    asset_type: 'image' | 'video';
    url: string;
    mime_type: string;
    file_size: number;
    created_at: string;
}

export interface AdCampaignRegion {
    id: string;
    campaign_id: string;
    region: GeographicRegion;
    country_codes?: string[];
}

export interface BidSuggestion {
    suggested_cpm: number;
    min_bid: number;
    max_bid: number;
    competition_level: 'low' | 'medium' | 'high';
}

export function createAdsRepository(client: DbClient) {
    return {
        /** Fetch all campaigns for an account. */
        async getCampaigns(
            accountId: string,
            opts?: ListOptions & { status?: CampaignStatus }
        ): Promise<RepoResult<AdCampaign[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            let query = client
                .from('ad_campaigns')
                .select('id, account_id, title, type, status, start_at, end_at, total_budget, daily_limit, spent_amount, target_url, target_event_id, target_country_code, total_impressions, total_clicks, reference, created_at')
                .eq('account_id', accountId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (opts?.status) query = query.eq('status', opts.status);

            const { data, error } = await query;
            if (error) return { data: null, error: toError(error) };
            return { data: data as AdCampaign[], error: null };
        },

        /** Fetch a single campaign by ID. */
        async findById(campaignId: string): Promise<RepoResult<AdCampaign>> {
            const { data, error } = await client
                .from('ad_campaigns')
                .select('*')
                .eq('id', campaignId)
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as AdCampaign, error: null };
        },

        /** Create a new ad campaign. */
        async create(params: {
            accountId: string;
            title: string;
            type: AdCampaign['type'];
            startAt: string;
            endAt: string;
            totalBudget: number;
            dailyLimit?: number;
            targetUrl: string;
            targetEventId?: string;
            targetCountryCode?: string;
        }): Promise<RepoResult<AdCampaign>> {
            const { data, error } = await client
                .from('ad_campaigns')
                .insert({
                    account_id: params.accountId,
                    title: params.title,
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
        async update(campaignId: string, fields: Partial<Pick<AdCampaign, 'title' | 'start_at' | 'end_at' | 'total_budget' | 'daily_limit' | 'target_url' | 'target_event_id' | 'target_country_code'>>): Promise<RepoResult<AdCampaign>> {
            const { data, error } = await client
                .from('ad_campaigns')
                .update(fields)
                .eq('id', campaignId)
                .select()
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as AdCampaign, error: null };
        },

        /** Change a campaign's status. */
        async updateStatus(campaignId: string, status: CampaignStatus): Promise<RepoResult<null>> {
            const { error } = await client
                .from('ad_campaigns')
                .update({ status })
                .eq('id', campaignId);

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Fetch all creative assets for a campaign. */
        async getAssets(campaignId: string): Promise<RepoResult<AdAsset[]>> {
            const { data, error } = await client
                .from('ad_assets')
                .select('id, campaign_id, asset_type, url, mime_type, file_size, created_at')
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: false });

            if (error) return { data: null, error: toError(error) };
            return { data: data as AdAsset[], error: null };
        },

        /** Fetch regional targeting for a campaign. */
        async getRegions(campaignId: string): Promise<RepoResult<AdCampaignRegion[]>> {
            const { data, error } = await client
                .from('ad_campaign_regions')
                .select('id, campaign_id, region, country_codes')
                .eq('campaign_id', campaignId);

            if (error) return { data: null, error: toError(error) };
            return { data: data as AdCampaignRegion[], error: null };
        },

        /** Get a bid CPM suggestion for a campaign/region. Wraps `get_market_bid_suggestion` RPC. */
        async getBidSuggestion(campaignId: string, region: GeographicRegion): Promise<RepoResult<BidSuggestion>> {
            const { data, error } = await client.rpc('get_market_bid_suggestion', {
                p_campaign_id: campaignId,
                p_region: region,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: data as BidSuggestion, error: null };
        },

        /** Log an ad impression or click. Wraps `log_ad_interaction` RPC. */
        async logInteraction(params: {
            campaignId: string;
            interactionType: 'impression' | 'click';
            userId?: string;
            metadata?: Record<string, unknown>;
        }): Promise<RepoResult<null>> {
            const { error } = await client.rpc('log_ad_interaction', {
                p_campaign_id: params.campaignId,
                p_interaction_type: params.interactionType,
                p_user_id: params.userId ?? null,
                p_metadata: params.metadata ?? {},
            });

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },
    };
}
