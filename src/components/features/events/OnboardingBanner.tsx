"use client";

import Link from 'next/link';
import Badge from '@/components/shared/Badge';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import type { OrganizerOnboardingStatus } from '@/hooks/useOrganizerOnboarding';

interface OnboardingChecklistProps {
    status: OrganizerOnboardingStatus;
}

const STEPS = [
    {
        key: 'account_details_complete' as const,
        label: 'Complete account details',
        description: 'Add your legal name and country.',
        href: '/dashboard/organize/settings?tab=account',
    },
    {
        key: 'kyc_approved' as const,
        label: 'Complete KYC verification',
        description: 'Upload an ID document for review.',
        href: '/dashboard/organize/settings?tab=account',
    },
    {
        key: 'wallet_exists' as const,
        label: 'Create a payout wallet',
        description: 'Add a wallet to receive ticket payments.',
        href: '/dashboard/organize/settings?tab=billing',
    },
];

export default function OnboardingChecklist({ status }: OnboardingChecklistProps) {
    if (status.can_create_paid_events) return null;

    const isStepComplete = (key: typeof STEPS[number]['key']) => {
        if (key === 'kyc_approved') return status.kyc_status === 'approved';
        return status[key];
    };

    const completedCount = STEPS.filter(s => isStepComplete(s.key)).length;

    return (
        <div className={adminStyles.pageCard} style={{ marginBottom: 20, borderLeft: '3px solid var(--color-warning, #d97706)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Unlock paid tickets ({completedCount}/3)</h3>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.75 }}>
                You can create free events right away. To sell paid tickets, finish these steps first.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STEPS.map(step => {
                    const complete = isStepComplete(step.key);
                    return (
                        <Link
                            key={step.key}
                            href={step.href}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 12px',
                                borderRadius: 8,
                                background: 'var(--color-bg-subtle)',
                                textDecoration: 'none',
                                color: 'inherit',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>{step.label}</div>
                                <div style={{ fontSize: 12, opacity: 0.65 }}>{step.description}</div>
                            </div>
                            <Badge
                                label={complete ? 'Done' : 'Pending'}
                                variant={complete ? 'success' : 'warning'}
                                showDot
                            />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
