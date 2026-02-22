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
    status: 'active' | 'pending' | 'past' | 'rejected';
    attendees: number;
    thumbnailUrl?: string;
}

/** A row in the organizer events (overview) table. */
export interface EventRow {
    id: string;
    name: string;
    tickets: string;
    status: 'published' | 'draft' | 'ended';
    revenue: string;
    date: string;
}

/** A financial transaction in the revenue page. */
export interface FinanceTransaction {
    id: string;
    description: string;
    amount: number | string;
    date: string;
    status: 'Completed' | 'Pending' | 'Failed' | 'completed' | 'pending' | 'failed';
    type: 'ticket_sale' | 'Ticket Sale' | 'payout' | 'refund' | 'commission' | 'fee' | 'subscription' | 'Vendor Fee' | 'Sponsorship';
    reference?: string;
    /** Used in organizer context to group transactions by event. */
    event?: string;
    /** @deprecated Use `reference` instead. Kept for backward compatibility with admin finance page. */
    referenceId?: string;
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
    sold: number;
    revenue: number;
    conversion: string;
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
