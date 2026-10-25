export interface TransactionRow {
    id: string;
    reason: string;
    event_title?: string | null;
    amount: number;
    currency: string;
    created_at: string;
    status: string;
    category: string;
    reference: string;
    sender_name: string | null;
    recipient_name: string | null;
}
