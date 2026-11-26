import type { Metadata } from 'next';
import SoftwareAppJsonLd from '@/components/public/SoftwareAppJsonLd';

export const metadata: Metadata = {
  title: 'For Organizers — Event Ticketing & Private Forums',
  description: 'Create, promote and manage your events with Lynk-X (Lynk) — ticketing, payouts, attendee management and event forums in one dashboard.',
  alternates: {
    canonical: '/for/organizers',
  },
  openGraph: {
    title: 'For Organizers — Dominate the Event Lifecycle | Lynk-X',
    description: 'Give your event a forum alongside your ticketing. Set up your event in minutes. Free to start.',
    url: 'https://lynk-x.app/for/organizers',
    siteName: 'Lynk-X',
    locale: 'en_GB',
    images: [
      {
        url: '/og-organizer.png',
        width: 1200,
        height: 630,
        alt: 'Lynk-X for Organizers — Dominate the Event Lifecycle',
        type: 'image/png',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'For Organizers — Dominate the Event Lifecycle | Lynk-X',
    description: 'Give your event a forum alongside your ticketing. Set up your event in minutes. Free to start.',
    site: '@lynkxapp',
    creator: '@lynkxapp',
    images: ['/og-organizer.png'],
  },
};

/**
 * Metadata layout shell for the organizers marketing landing page.
 */
export default function OrganizersLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SoftwareAppJsonLd />
      {children}
    </>
  );
}
