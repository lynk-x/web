/**
 * Status union types strictly aligned with their corresponding DB enum definitions.
 * Keep these in sync with PART 02 of initial_schema.sql.
 */

/** Matches `campaign_status` enum */
export type CampaignStatus = 'draft' | 'pending_approval' | 'active' | 'paused' | 'completed' | 'rejected';

/** Matches `event_status` enum */
export type EventStatus = 'draft' | 'published' | 'active' | 'completed' | 'archived' | 'postponed' | 'cancelled' | 'suspended';

/** Matches `forum_status` enum (all lowercase in DB) */
export type ForumStatus = 'open' | 'read_only' | 'archived';

/** Matches `user_status` enum */
export type UserStatus = 'active' | 'suspended' | 'partially_active';

/** Matches `payout_status` enum */
export type PayoutStatus = 'requested' | 'processing' | 'completed' | 'failed' | 'rejected';

/** Matches `payment_status` enum */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';

/** Matches `ticket_status` enum */
export type TicketStatus = 'valid' | 'used' | 'transferred' | 'refunded' | 'cancelled' | 'expired';

/** Matches `refund_status` enum */
export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'processed';

/** Matches `kyc_status` enum */
export type KycStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'suspended';

/** Matches `transaction_reason` enum */
export type TransactionReason =
    | 'ticket_sale'
    | 'ad_campaign_payment'
    | 'organizer_payment'
    | 'ad_refund'
    | 'ticket_refund'
    | 'dispute_settlement'
    | 'escrow_release'
    | 'payout_withdrawal';

/** Matches `geographic_region` enum */
export type GeographicRegion =
    | 'africa'
    | 'europe'
    | 'north_america'
    | 'south_america'
    | 'middle_east'
    | 'south_asia'
    | 'east_asia'
    | 'southeast_asia'
    | 'oceania';
