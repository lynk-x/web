import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Account Recovery',
    robots: { index: false, follow: false },
};

export default function RecoverLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
