"use client";

import { useParams } from 'next/navigation';
import SubNav from '@/components/dashboard/SubNav';

/**
 * Navigation tabs for a single campaign's subpages, built from the route parameter.
 * Used by the layout under /dashboard/ads/campaigns/[id].
 */
const CampaignSubNav = () => {
    const { id } = useParams<{ id: string }>();
    const base = `/dashboard/ads/campaigns/${id}`;

    return (
        <SubNav
            label="Campaign sections"
            tabs={[
                { label: 'Overview', href: base, exact: true },
                { label: 'Audience', href: `${base}/audience` },
                { label: 'Variants', href: `${base}/variants` },
                { label: 'Spend history', href: `${base}/spend-history` },
                { label: 'Analytics', href: `/dashboard/ads/analytics/campaign/${id}` },
                { label: 'Edit', href: `${base}/edit` },
            ]}
        />
    );
};

export default CampaignSubNav;
