import { Metadata } from 'next';
import ConfirmationPageClient from './page.client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Order Confirmed | Lynk-X',
  description: 'Your ticket purchase was successful. View your order confirmation and proceed to the event forum.',
  robots: { index: false, follow: false },
};

export default function ConfirmationPage() {
    return <ConfirmationPageClient />;
}
