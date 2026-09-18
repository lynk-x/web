import { Metadata } from 'next';
import SignupPage from '../SignupPage';

export const metadata: Metadata = {
    title: 'Create Account',
};

export default function SignupRoute() {
    return <SignupPage />;
}
