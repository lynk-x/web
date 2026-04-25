export interface Event {
    id: string;
    title: string;
    description: string;
    start_datetime: string;
    end_datetime: string;
    /**
     * IANA display timezone for the event (e.g. 'Africa/Nairobi').
     * This is a CLIENT DISPLAY HINT — starts_at / ends_at are always UTC.
     * NULL means inherit from the organiser's country timezone.
     * Exposed by vw_public_events and vw_user_tickets as `display_timezone`.
     */
    timezone?: string;
    /** 
     * Event Location information. 
     * JSONB format: { name: string, address: string, link: string (online), is_online: boolean }
     */
    location: any;
    /** 
     * Event Media assets. 
     * JSONB format: { cover_image_url: string, thumbnail_url: string, gallery: string[] }
     */
    media: any;
    category?: string;
    account_id?: string;
    organizer_name?: string;
    low_price?: number;
    currency?: string;
    /** Admin-curated flag — true when event appears on homepage carousel */
    is_featured?: boolean;
    reference: string;
    tags?: string[];
}

export interface Category {
    id: string;
    name: string;
    icon?: string;
}
