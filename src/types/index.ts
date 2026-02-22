export interface Event {
    id: string;
    title: string;
    description: string;
    start_datetime: string;
    end_datetime: string;
    location_name: string;
    thumbnail_url?: string;
    category?: string;
    account_id?: string;
    organizer_name?: string;
    low_price?: number;
    currency?: string;
    is_featured?: boolean;
}

export interface Category {
    id: string;
    name: string;
    icon?: string;
}
