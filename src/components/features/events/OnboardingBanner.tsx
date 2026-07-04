"use client";

import { useState } from 'react';
import Link from 'next/link';
import type { OrganizerOnboardingStatus } from '@/hooks/useOrganizerOnboarding';

interface OnboardingBannerProps {
    status: OrganizerOnboardingStatus;
}

export default function OnboardingBanner({ status }: OnboardingBannerProps) {
    const [dismissed, setDismissed] = useState(false);

    if (status.can_create_paid_events || dismissed) return null;

    const missing: string[] = [];
    if (!status.account_details_complete) missing.push('add your legal name and country in Settings → Account');
    if (status.kyc_status !== 'approved') missing.push('complete KYC verification in Settings → Account');
    if (!status.wallet_exists) missing.push('create a payout wallet in Settings → Billing & Wallet');

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
                padding: '14px 16px',
                margin: '4px 0',
                borderRadius: 8,
                background: 'var(--color-warning-subtle, #fef3c7)',
                border: '1px solid var(--color-warning, #d97706)',
                color: 'var(--color-warning-text, #92400e)',
            }}
        >
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                <strong>You can publish free events right away.</strong> To create paid ticket tiers, you still need to{' '}
                {missing.map((step, i) => (
                    <span key={step}>
                        {step}
                        {i < missing.length - 1 ? (missing.length > 2 && i === missing.length - 2 ? ', and ' : ', ') : '.'}
                    </span>
                ))}
                {' '}Visit{' '}
                <Link href="/dashboard/organize/settings?tab=account" style={{ color: 'inherit', fontWeight: 600, textDecoration: 'underline' }}>
                    Account Settings
                </Link>{' '}
                or{' '}
                <Link href="/dashboard/organize/settings?tab=billing" style={{ color: 'inherit', fontWeight: 600, textDecoration: 'underline' }}>
                    Billing &amp; Wallet
                </Link>{' '}
                to finish these steps.
            </p>
            <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Dismiss"
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    opacity: 0.7,
                    flexShrink: 0,
                    padding: 2,
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    );
}
