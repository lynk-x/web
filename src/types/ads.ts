/**
 * Ads domain types.
 *
 * Centralised definitions used by advertiser dashboard components.
 * Components re-export these for backward compatibility.
 */

/** An advertiser-managed campaign. */
export interface AdsCampaign {
    id: string;
    /** Internal DB field: title */
    title: string;
    /** From `ad_type` enum */
    type: 'banner' | 'interstitial' | 'feed_card' | 'map_pin';
    /** From `campaign_status` enum */
    status: 'draft' | 'active' | 'paused' | 'completed' | 'rejected';
    /** ISO dates from start_at and end_at */
    start_at: string;
    end_at: string;
    /** Financials */
    total_budget: number;
    daily_limit?: number;
    spent_amount: number;
    /** Creative/Targeting */
    target_url: string;
    target_event_id?: string;
    target_country_code?: string;
    /** UI-only metrics (usually joined from analytics) */
    metrics?: {
        impressions: number;
        clicks: number;
        ctr: number;
    };
    /** Backward compatibility / UI display fields */
    name?: string; // mapping from title
    spent?: string; // formatted spent_amount
    dates?: string; // formatted range
}

/** An advertising invoice. */
export interface Invoice {
    id: string;
    date: string;
    amount: string;
    status: 'paid' | 'pending' | 'overdue';
}
