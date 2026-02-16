export interface Guest {
    id: string;
    name: string;
    email: string;
    ticketType: 'VIP' | 'Standard' | 'Early Bird';
    status: 'Checked In' | 'Pending';
    purchaseDate: string;
}
