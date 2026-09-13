import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Attendees | Lynk-X',
  description: 'Discover events near you, buy tickets and join event communities with Lynk-X (Lynk) — the event app built for attendees.',
  alternates: {
    canonical: '/for/attendees',
  },
};

export default function AttendeesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
