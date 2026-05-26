import { Metadata } from 'next';
import AuthPage from './AuthPage';

export const metadata: Metadata = {
    title: 'Login',
};

export default function LoginPage() {
    return <AuthPage />;
}
