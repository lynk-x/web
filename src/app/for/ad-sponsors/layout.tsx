import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Sponsors & Advertisers | Lynk-X',
  description: 'Reach event-goers with targeted campaigns and sponsorships on Lynk-X (Lynk) — the event discovery platform connecting brands with local audiences.',
  alternates: {
    canonical: '/for/ad-sponsors',
  },
  openGraph: {
    title: 'For Sponsors — Sell to the Right Crowd | Lynk-X',
    description: 'Your brand inside the events people already showed up for.',
    url: 'https://lynk-x.app/for/ad-sponsors',
    siteName: 'Lynk-X',
    images: [
      {
        url: '/og-sponsor.png',
        width: 1200,
        height: 630,
        alt: 'Lynk-X for Sponsors — Sell to the right crowd',
        type: 'image/png',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'For Sponsors — Sell to the Right Crowd | Lynk-X',
    description: 'Your brand inside the events people already showed up for.',
    site: '@lynkxapp',
    creator: '@lynkxapp',
    images: ['/og-sponsor.png'],
  },
};

/**
 * Metadata layout shell for the public ad-sponsors marketing page.
 */
export default function AdSponsorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
