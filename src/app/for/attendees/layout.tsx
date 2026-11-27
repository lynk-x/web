import type { Metadata } from 'next';
import SoftwareAppJsonLd from '@/components/public/shared/SoftwareAppJsonLd';

export const metadata: Metadata = {
  title: 'For Attendees — Discover Events, Buy Tickets & Join Forums',
  description: 'Discover events near you, buy tickets and join event communities with Lynk-X (Lynk) — the event app built for attendees.',
  alternates: {
    canonical: '/for/attendees',
  },
  openGraph: {
    title: 'For Attendees — Every Event. Every Connection. | Lynk-X',
    description: 'Join the event forum for organizer updates, live chat and the shared media wall.',
    url: 'https://lynk-x.app/for/attendees',
    siteName: 'Lynk-X',
    locale: 'en_GB',
    images: [
      {
        url: '/og-attendee.png',
        width: 1200,
        height: 630,
        alt: 'Lynk-X for Attendees — Every Event. Every Connection.',
        type: 'image/png',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'For Attendees — Every Event. Every Connection. | Lynk-X',
    description: 'Join the event forum for organizer updates, live chat and the shared media wall.',
    site: '@lynkxapp',
    creator: '@lynkxapp',
    images: ['/og-attendee.png'],
  },
};

/**
 * Metadata layout shell for the attendees marketing landing page.
 */
export default function AttendeesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SoftwareAppJsonLd />
      {children}
    </>
  );
}
