/**
 * Organizer domain types.
 *
 * Centralised definitions used by organizer dashboard tables and components.
 * Components re-export these for backward compatibility.
 */

/**
 * Organizer-facing Event type used by `EventTable`.
 *
 * NOTE: This is distinct from the public `Event` in `@/types/index.ts` which
 * models Supabase rows. This one models the organizer dashboard table row.
 */
export interface OrganizerEvent {
    id: string;
    title: string;
    organizer: string;
    date: string;
    endDate?: string;
    time: string;
    endTime?: string;
    location: string;
    /**
     * Exhaustive alignment with `event_status` schema enum.
     * draft → published → active → completed/cancelled/archived/postponed/suspended
     */
    status: 'draft' | 'published' | 'active' | 'completed' | 'archived' | 'cancelled' | 'postponed' | 'suspended';
    attendees: number;
    /** Unique share/lookup code — from `events.reference` column */
    eventReference?: string;
    /** Whether the event is private — from `events.is_private` column */
    isPrivate?: boolean;
    thumbnailUrl?: string;
    reportsCount?: number;
    currency?: string;
}

/** A row in the organizer events (overview) table. */
export interface EventRow {
    id: string;
    name: string;
    /** Current attendee count (from `events.attendee_count`) */
    attendees: number;
    /** Total capacity (sum of `ticket_tiers.quantity_total`) */
    capacity: number;
    status: 'published' | 'draft' | 'ended';
    /** Revenue calculated from `ticket_tiers.price` * `quantity_sold` */
    revenue: number;
    date: string;
    endDate?: string;
    time: string;
    endTime?: string;
    /** Unique share/lookup code — from `events.reference` column */
    reference?: string;
    currency?: string;
}

/** A financial transaction — aligned to the `transactions` DB table.
 *
 * ticket_sale | ad_campaign_payment | organizer_payment
 * ad_refund | ticket_refund | dispute_settlement
 * escrow_release | payout_withdrawal | subscription_payment
 *
 * NOTE: Aligned with the transaction_reason enum in public schema.
 *
 * `status` maps to the `payment_status` enum:
 * pending | completed | failed | cancelled | refunded
 */
export interface FinanceTransaction {
    id: string;
    description: string;
    amount: number | string;
    date: string;
    /** Aligned to `payment_status` enum — always lowercase */
    status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
    /** Aligned to `transaction_reason` enum (exhaustive) */
    type: 'ticket_sale' | 'ad_campaign_payment' | 'organizer_payment'
        | 'ad_refund' | 'ticket_refund' | 'dispute_settlement'
        | 'escrow_release' | 'payout_withdrawal' | 'subscription_payment';
    /** `transaction_category` enum: incoming | outgoing | internal | hold */
    category?: 'incoming' | 'outgoing' | 'internal' | 'hold';
    reference?: string;
    /** @deprecated Use `reference` instead. Kept for backward compatibility. */
    referenceId?: string;
    /** Used in organizer context to group transactions by event. */
    event?: string;
    /**
     * The authenticated user who initiated this transaction.
     * Maps to `transactions.initiated_by` (new audit column).
     * Distinct from sender_id/recipient_id which are legacy financial direction markers.
     */
    initiatedBy?: string;
}

/** A payout request — aligned to the `payouts` DB table.
 *
 * `status` maps to `payout_status` enum:
 * requested | processing | completed | failed | rejected
 */
export interface Payout {
    id: string;
    /** Display name of the organizer/advertiser receiving funds */
    recipient: string;
    /** Requested amount in USD */
    amount: number;
    /** Aligned to `payout_status` enum */
    status: 'requested' | 'processing' | 'completed' | 'failed' | 'rejected';
    /** ISO date string of the payout request */
    requestedAt: string;
    /** Set when status transitions to 'completed' or 'failed'. From `payouts.processed_at`. */
    processedAt?: string;
    /** From accounts.kyc_status - pending | submitted | approved | rejected | suspended */
    kyc_status?: 'pending' | 'submitted' | 'approved' | 'rejected' | 'suspended';
    /** Aligned to kyc_status logic: approved accounts are verified */
    is_verified?: boolean;
    /** JSON metadata for provider or audit details */
    metadata?: Record<string, unknown>;
    /** Reference code (from payout_ref_seq e.g. PO-1001) */
    reference?: string;
    /** Display name of the event or account associated with the payout */
    eventName?: string;
    /** The reference of the wallet from which funds are being paid */
    payableWallet?: string;
    /** The currency of the payout */
    currency?: string;
    /** Internal admin notes */
    notes?: string;
}

/** A notification item in the organizer notifications table. */
export interface NotificationItem {
    id: string;
    type: 'email' | 'alert' | 'success';
    title: string;
    description: string;
    time: string;
    read: boolean;
}

/** An event performance summary row. */
export interface PerformanceEvent {
    id: number | string;
    event: string;
    /** Number of tickets sold (sum of `ticket_tiers.quantity_sold`) */
    ticketsSold: number;
    /** Total revenue (sum of `quantity_sold` * `price`) */
    totalRevenue: number;
    /** Estimated revenue after platform commission (95% of totalRevenue) */
    netRevenue: number;
    /** Conversion rate string e.g. "4.2%" */
    conversionRate: string;
    status: string;
}

/** Form data for creating/editing an event. */
export interface OrganizerEventFormData {
    title: string;
    description: string;
    category: string;
    tags: string[];
    thumbnailUrl?: string;
    isOnline: boolean;
    location: string;
    coordinates?: [number, number];
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    /**
     * IANA display timezone for the event (e.g. 'Africa/Nairobi').
     * Optional: if omitted, resolves from the organiser's country.
     * Maps to `events.timezone` column added in schema review.
     */
    timezone?: string;
    isPrivate: boolean;
    tickets: OrganizerEventTicket[];
    status?: 'draft' | 'published';
    isPaid?: boolean;
    currency: string;
}

/** A ticket tier within the event form. */
export interface OrganizerEventTicket {
    id?: string;
    display_name: string;
    price: string;
    capacity: string;
    description?: string;
    saleStart?: string;
    saleEnd?: string;
    maxPerOrder?: string;
}

/** An attendee in the event's attendee list. */
export interface Attendee {
    id: string;
    name: string;
    email: string;
    /** From `ticket_tiers.name` */
    tierName: string; // Matches display_name in DB
    purchaseDate: string;
    /** 'valid' | 'used' | 'transferred' | 'cancelled' | 'expired' (matches `ticket_status` enum) */
    status: 'valid' | 'used' | 'transferred' | 'cancelled' | 'expired';
    /** Unique alphanumeric ticket code */
    ticketCode: string;
}

/** Account Payment Method configuration */
export interface AccountPaymentMethod {
    id: string;
    account_id: string;
    provider: string; // e.g., 'stripe_connect', 'mpesa', 'bank_transfer', 'paypal'
    provider_identity: string; // Encrypted IBAN, Stripe Account ID, Mobile number
    is_primary: boolean;
    metadata?: any;
    created_at: string;
    updated_at: string;
}

/** Account Wallet for multi-currency balances */
export interface AccountWallet {
    id: string; // usually used as the currency/key in some UI contexts
    reference: string;
    account_id: string;
    currency: string;
    balance: number;
    escrow_balance: number;
    updated_at: string;
}
