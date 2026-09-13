import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Advertisers | Lynk-X',
  description: 'Reach event-goers with targeted ad campaigns on Lynk-X (Lynk) — the event discovery platform connecting brands with local audiences.',
  alternates: {
    canonical: '/for/advertisers',
  },
};

export default function AdvertisersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
