import { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import { createSponsorshipsRepository } from '@/lib/repositories';
import { SponsorshipClaimClient } from './SponsorshipClaimClient';

interface ClaimPageProps {
    params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: ClaimPageProps): Promise<Metadata> {
    const { token } = await params;
    const supabase = await createClient();
    const sponsorshipsRepo = createSponsorshipsRepository(supabase);

    const { data: invite } = await sponsorshipsRepo.getInviteByToken(token);

    if (!invite || !invite.found) {
        return {
            title: 'Sponsorship Invitation | Lynk-X',
            description: 'Direct sponsor invitation on Lynk-X.',
        };
    }

    const title = `${invite.company_name} — ${invite.tier.name} Sponsorship for ${invite.event.title} | Lynk-X`;
    const description = `Review guaranteed deliverables, brand showcasing and exclusive sponsorship terms for ${invite.event.title}.`;
    const image = invite.event.media?.hero || invite.event.media?.poster || '/og-sponsor.png';

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: `/sponsorships/claim/${token}`,
            siteName: 'Lynk-X',
            images: [
                {
                    url: String(image),
                    width: 1200,
                    height: 630,
                    alt: `${invite.event.title} Sponsorship`,
                    type: 'image/png',
                },
            ],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            site: '@lynkxapp',
            creator: '@lynkxapp',
            images: [String(image)],
        },
    };
}

/**
 * Public claim and acceptance landing page for direct tokenized sponsorship invitations ([P7]).
 * Serves server-rendered event co-branding, validated contract deliverables, and mounts the
 * interactive client controller for corporate partner checkout and instant campaign provisioning.
 */
export default async function SponsorshipClaimPage({ params }: ClaimPageProps) {
    const { token } = await params;
    const supabase = await createClient();
    const sponsorshipsRepo = createSponsorshipsRepository(supabase);

    // Fetch initial invite data server-side to guarantee SEO metadata and zero layout shift
    const { data: inviteData } = await sponsorshipsRepo.getInviteByToken(token);

    return (
        <main>
            <SponsorshipClaimClient token={token} initialData={inviteData} />
        </main>
    );
}
