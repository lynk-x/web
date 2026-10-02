import { Metadata } from 'next';
import MfaChallengeClient from './MfaChallengeClient';

export const metadata: Metadata = {
    title: 'Two-Factor Authentication',
    robots: { index: false, follow: false },
};

export default function MfaChallengePage() {
    return <MfaChallengeClient />;
}
