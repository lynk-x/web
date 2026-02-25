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
    location: string;
    /**
     * Aligned to `event_status` schema enum.
     * draft → published → active → completed/cancelled/archived
     */
    status: 'draft' | 'published' | 'active' | 'completed' | 'archived' | 'cancelled';
    attendees: number;
    /** Unique share/lookup code — from `events.event_code` column */
    eventCode?: string;
    /** Whether the event is private — from `events.is_private` column */
    isPrivate?: boolean;
    thumbnailUrl?: string;
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
}

/** A financial transaction — aligned to the `transactions` DB table.
 *
 * `type` maps to the `transaction_reason` enum:
 * ticket_sale | subscription | ad_campaign_payment | organizer_payment
 * ad_refund | ticket_refund | subscription_refund | dispute_settlement
 * escrow_release | payout_withdrawal
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
    /** Aligned to `transaction_reason` enum */
    type: 'ticket_sale' | 'subscription' | 'ad_campaign_payment' | 'organizer_payment'
    | 'ad_refund' | 'ticket_refund' | 'subscription_refund' | 'dispute_settlement'
    | 'escrow_release' | 'payout_withdrawal';
    /** `transaction_category` enum: incoming | outgoing | internal | hold */
    category?: 'incoming' | 'outgoing' | 'internal' | 'hold';
    reference?: string;
    /** @deprecated Use `reference` instead. Kept for backward compatibility. */
    referenceId?: string;
    /** Used in organizer context to group transactions by event. */
    event?: string;
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
    /** Reference code (from `payout_ref_seq` e.g. PO-1001) */
    reference?: string;
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
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    isPrivate: boolean;
    isPaid: boolean;
    limit: string;
    tickets: OrganizerEventTicket[];
}

/** A ticket tier within the event form. */
export interface OrganizerEventTicket {
    id?: string;
    name: string;
    price: string;
    quantity: string;
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
    tierName: string;
    purchaseDate: string;
    /** 'valid' | 'used' | 'transferred' | 'cancelled' | 'expired' (matches `ticket_status` enum) */
    status: 'valid' | 'used' | 'transferred' | 'cancelled' | 'expired';
    /** Unique alphanumeric ticket code */
    ticketCode: string;
}
