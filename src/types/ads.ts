/**
 * Ads domain types.
 *
 * Centralised definitions used by advertiser dashboard components.
 * Components re-export these for backward compatibility.
 */

/** An advertiser-managed campaign. */
export interface AdsCampaign {
    id: string;
    name: string;
    /** From `ad_type` enum */
    type: 'banner' | 'interstitial' | 'feed_card' | 'map_pin';
    status: 'active' | 'paused' | 'draft' | 'completed' | 'scheduled';
    /** Combined date range string, e.g. "Oct 12 - Oct 20, 2024" */
    dates: string;
    /** Display-ready string, e.g. "12.5k" or "650" */
    impressions: string;
    /** Display-ready string, e.g. "650" */
    clicks: string;
    /** Display-ready currency string, e.g. "$450.00" */
    spent: string;
}

/** An advertising invoice. */
export interface Invoice {
    id: string;
    date: string;
    amount: string;
    status: 'paid' | 'pending' | 'overdue';
}
