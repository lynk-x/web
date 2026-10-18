/**
 * Commercial & advertising domain types.
 *
 * Centralised definitions used by commercial dashboard components and campaign management.
 */

import type { CampaignStatus } from './status';

/** Partner or advertising campaign entity. */
export interface Campaign {
    id: string;
    created_at: string;
    /** Internal DB field: title */
    title: string;
    /** From `ad_type` enum */
    type: 'banner' | 'interstitial' | 'interstitial_video';
    /** From `campaign_status` enum */
    status: CampaignStatus;
    /** ISO dates from start_at and end_at */
    start_at: string;
    end_at: string;
    /** Financials */
    total_budget: number;
    daily_limit?: number;
    spent_amount: number;
    currency: string;
    /** Creative/Targeting */
    destination_url: string;
    target_event_id?: string;
    target_country_code?: string;
    target_tags?: string[];
    target_regions?: string[];
}

/** A partner billing invoice. */
export interface Invoice {
    id: string;
    date: string;
    amount: string;
    status: 'paid' | 'pending' | 'overdue';
    reference?: string;
    reason?: string;
    campaign_title?: string;
    currency?: string;
    createdAtRaw?: string;
}
