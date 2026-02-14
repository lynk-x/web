export interface Event {
    id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    location_name: string;
    cover_image_url?: string;
    category?: string;
    low_price?: number;
    currency?: string;
    organizer_id?: string;
    is_featured?: boolean;
}

export interface Category {
    id: string;
    name: string;
    icon?: string;
}
