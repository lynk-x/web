import CheckoutView from '@/components/public/CheckoutView';
import { Suspense } from 'react';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Secure Checkout | Lynk-X',
  description: 'Complete your ticket purchase securely on Lynk-X.',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
    return (
        <Suspense fallback={<div>Loading checkout...</div>}>
            <CheckoutView />
        </Suspense>
    );
}
