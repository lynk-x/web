import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Reset Password',
};

export default function UpdatePasswordLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
