/**
 * Cart domain types.
 *
 * Shared across checkout and cart context.
 */

/** A single item in the shopping cart. */
export interface CartItem {
    /** Composite key: eventId-ticketType */
    id: string;
    eventId: string;
    eventTitle: string;
    ticketType: string;
    price: number;
    quantity: number;
    currency: string;
    image?: string;
}
