import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Organizers | Lynk-X',
  description: 'Create, promote and manage your events with Lynk-X (Lynk) — ticketing, payouts, attendee management and event forums in one dashboard.',
  alternates: {
    canonical: '/for/organizers',
  },
};

export default function OrganizersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
