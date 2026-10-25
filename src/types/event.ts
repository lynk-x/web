export interface SharedEventDetail {
    id: string;
    title: string;
    reference?: string;
    status?: string;
    account_id?: string;
    organizer?: string;
    starts_at?: string;
    ends_at?: string | null;
    location?: any;
    media?: any;
    description?: string;
    timezone?: string | null;
    is_private?: boolean;
    currency?: string;
    cancellation_reason?: string | null;
    tags?: string[];
    created_at?: string;
    forum_reference?: string | null;
    ticket_tiers?: unknown[];
}