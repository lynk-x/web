import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Two-Factor Authentication',
    robots: { index: false, follow: false },
};

export default function MfaChallengeLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
