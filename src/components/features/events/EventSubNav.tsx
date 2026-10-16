"use client";

import { useParams } from 'next/navigation';
import SubNav from '@/components/dashboard/SubNav';

/**
 * The tabs for one event's pages, built from the `id` in the route. Used by the layouts of the event's pages and
 * of its edit page; there is no event yet on the create page, so it has no strip.
 */
const EventSubNav = () => {
    const { id } = useParams<{ id: string }>();
    const base = `/dashboard/organize/events/${id}`;

    return (
        <SubNav
            label="Event sections"
            tabs={[
                { label: 'Overview', href: base, exact: true },
                { label: 'Tiers', href: `${base}/tiers` },
                { label: 'Sponsorships', href: `${base}/sponsorships` },
                { label: 'Attendees', href: `${base}/attendees` },
                { label: 'Check-ins', href: `${base}/check-ins` },
                { label: 'Promo codes', href: `${base}/promo-codes` },
                { label: 'Refunds', href: `${base}/refunds` },
                { label: 'Waitlist', href: `${base}/waitlist` },
                { label: 'Analytics', href: `/dashboard/organize/analytics/event/${id}` },
                { label: 'Edit', href: `/dashboard/organize/events/edit/${id}` },
            ]}
        />
    );
};

export default EventSubNav;
