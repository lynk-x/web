import CampaignSubNav from '@/components/ads/campaigns/CampaignSubNav';

/**
 * Shared frame for a campaign's overview and sub-pages (audience, variants, spend history, edit): adds the phone
 * tab strip above whichever page is open.
 */
export default function CampaignLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <CampaignSubNav />
            {children}
        </>
    );
}
