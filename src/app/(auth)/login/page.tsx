import { Metadata } from 'next';
import AuthPage from '../AuthPage';

export const metadata: Metadata = {
    title: 'Login',
    robots: { index: false, follow: false },
};

export default function LoginPage() {
    return <AuthPage />;
}
