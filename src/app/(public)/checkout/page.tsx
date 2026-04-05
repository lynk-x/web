import CheckoutView from '@/components/public/CheckoutView';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
    return (
        <Suspense fallback={<div>Loading checkout...</div>}>
            <CheckoutView />
        </Suspense>
    );
}
