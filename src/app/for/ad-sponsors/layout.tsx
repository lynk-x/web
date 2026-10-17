import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Sponsors & Advertisers | Lynk-X',
  description: 'Reach event-goers with targeted campaigns and sponsorships on Lynk-X (Lynk) — the event discovery platform connecting brands with local audiences.',
  alternates: {
    canonical: '/for/ad-sponsors',
  },
};

/**
 * Metadata layout shell for the public ad-sponsors marketing page.
 */
export default function AdSponsorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
