import CheckoutView from '@/components/public/CheckoutView';
import { Suspense } from 'react';


export default async function CheckoutPage() {
    return (
        <Suspense fallback={<div>Loading checkout...</div>}>
            <CheckoutView />
        </Suspense>
    );
}
