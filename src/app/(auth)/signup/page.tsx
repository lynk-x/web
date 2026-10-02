import { Metadata } from 'next';
import SignupPage from '../SignupPage';

export const metadata: Metadata = {
    title: 'Create Account',
    robots: { index: false, follow: false },
};

export default function SignupRoute() {
    return <SignupPage />;
}
