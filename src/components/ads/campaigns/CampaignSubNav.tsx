"use client";

import { useParams } from 'next/navigation';
import SubNav from '@/components/dashboard/SubNav';

/**
 * The tabs for one campaign's pages, built from the `id` in the route. Used by the layout under
 * /dashboard/ads/campaigns/[id], which includes the campaign's edit page; the create page has no campaign yet,
 * so it has no strip.
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
