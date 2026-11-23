"use client";

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { TicketCheckoutView } from '@/components/public/checkout/tickets/TicketCheckoutView';
import { SubscriptionCheckoutView } from '@/components/public/checkout/subscription/SubscriptionCheckoutView';

/**
 * CheckoutView — Unified dynamic checkout router.
 * Dispatches to isolated, self-contained checkout contexts based on query params:
 * - `type=subscription`: Subscription checkout flow (attendee premium, catalog-driven).
 * - `type=tickets` (or default): Ticket checkout flow (cart items, reservations, promo codes).
 *
 * Both sub-flows maintain strict context isolation to eliminate state contamination
 * and simplify payment provider integration.
 */
export const CheckoutView: React.FC = () => {
    const searchParams = useSearchParams();
    const checkoutType = searchParams.get('type');

    if (checkoutType === 'subscription') {
        return <SubscriptionCheckoutView />;
    }

    return <TicketCheckoutView />;
};

export default CheckoutView;
