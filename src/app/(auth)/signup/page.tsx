import { Metadata } from 'next';
import AuthPage from '../AuthPage';

export const metadata: Metadata = {
    title: 'Create Account',
};

export default function SignupPage() {
    return <AuthPage initialMode="signup" />;
}
