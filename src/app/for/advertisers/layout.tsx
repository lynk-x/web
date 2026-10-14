import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Partners | Lynk-X',
  description: 'Reach event-goers with targeted campaigns and sponsorships on Lynk-X (Lynk) — the event discovery platform connecting brands with local audiences.',
  alternates: {
    canonical: '/for/advertisers',
  },
};

/**
 * Metadata layout shell for the public partner marketing page.
 */
export default function AdvertisersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
