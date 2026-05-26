import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Account Recovery',
};

export default function RecoverLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
