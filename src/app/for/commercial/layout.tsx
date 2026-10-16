import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Sponsors & Advertisers | Lynk-X',
  description: 'Reach event-goers with targeted campaigns and sponsorships on Lynk-X (Lynk) — the event discovery platform connecting brands with local audiences.',
  alternates: {
    canonical: '/for/commercial',
  },
};

/**
 * Metadata layout shell for the public commercial marketing page.
 */
export default function CommercialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
