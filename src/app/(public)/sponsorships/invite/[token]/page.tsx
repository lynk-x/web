import { redirect } from 'next/navigation';

/**
 * Route alias redirector — routes legacy or shorthand `/sponsorships/invite/[token]`
 * links directly to the canonical `/sponsorships/claim/[token]` claim route.
 */
export default async function InviteAliasRedirectPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    redirect(`/sponsorships/claim/${token}`);
}
