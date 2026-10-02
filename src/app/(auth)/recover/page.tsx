import { Metadata } from 'next';
import RecoverAccountClient from './RecoverAccountClient';

export const metadata: Metadata = {
    title: 'Account Recovery',
    robots: { index: false, follow: false },
};

export default function RecoverAccountPage() {
    return <RecoverAccountClient />;
}
