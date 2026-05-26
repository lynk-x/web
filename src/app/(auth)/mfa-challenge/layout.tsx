import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'MFA Challenge',
};

export default function MfaChallengeLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
