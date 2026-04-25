/**
 * Cart domain types.
 *
 * Shared across checkout and cart context.
 */

/** A single item in the shopping cart. */
export interface CartItem {
    /**
     * Unique cart-item key — used for deduplication within the cart.
     * Conventionally formatted as `${eventId}-ticket-${tierId}` in EventDetailsView,
     * but do NOT parse this string to recover tierId. Use the dedicated `tierId` field.
     */
    id: string;
    eventId: string;
    /** The ticket_tiers.id FK — separate field so checkout never has to split the composite id. */
    tierId: string;
    eventTitle: string;
    ticketType: string;
    price: number;
    quantity: number;
    currency: string;
    image?: string;
    eventReference: string;
}
