"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import styles from './onboarding.module.css';

type OnboardingStep = 'ROLE_SELECTION' | 'DETAILS';
type AccountType = 'organizer' | 'advertiser';

export default function OnboardingPage() {
    const router = useRouter();
    const supabase = createClient();
    const { refreshAccounts } = useOrganization();

    // Flow State
    const [step, setStep] = useState<OnboardingStep>('ROLE_SELECTION');
    const [accountType, setAccountType] = useState<AccountType>('organizer');

    // Form State
    const [orgName, setOrgName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleNext = () => {
        setStep('DETAILS');
        setError(null);
    };

    const handleBack = () => {
        setStep('ROLE_SELECTION');
        setError(null);
    };

    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!orgName.trim()) {
            setError('Organization name is required.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Updated to match the new p_ prefix and account_type support
            const { data, error: rpcError } = await supabase.rpc('create_organization_account', {
                p_org_name: orgName.trim(),
                p_account_type: accountType
            });

            if (rpcError) throw rpcError;

            // Successfully created. Refresh the global context.
            await refreshAccounts();

            if (accountType === 'advertiser') {
                router.push('/dashboard/ads');
            } else {
                router.push('/dashboard/organize/events');
            }

        } catch (err: any) {
            console.error('Error creating organization:', err);
            setError(err.message || 'Failed to create organization. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.onboardingWrapper}>
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        {step === 'ROLE_SELECTION' ? 'Choose Your Path' : 'The Finishing Touches'}
                    </h1>
                    <p className={styles.subtitle}>
                        {step === 'ROLE_SELECTION'
                            ? 'Select the primary goal for your new workspace. You can always change this or add more workspaces later.'
                            : `Let's name your ${accountType === 'organizer' ? 'Organising' : 'Advertising'} department. This is how you'll appear to the public.`}
                    </p>
                </div>

                <div className={styles.stepIndicator}>
                    <div className={`${styles.stepDot} ${step === 'ROLE_SELECTION' ? styles.stepDotActive : ''}`} />
                    <div className={`${styles.stepDot} ${step === 'DETAILS' ? styles.stepDotActive : ''}`} />
                </div>

                {step === 'ROLE_SELECTION' && (
                    <div className={styles.roleGrid}>
                        {/* Event Organizer Card */}
                        <div
                            className={`${styles.roleCard} ${accountType === 'organizer' ? styles.roleCardActive : ''}`}
                            onClick={() => setAccountType('organizer')}
                        >
                            <div className={styles.roleIcon} style={{ background: 'rgba(32, 249, 40, 0.1)', color: 'var(--color-brand-primary)' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                            </div>
                            <h2 className={styles.roleName}>Event Organizer</h2>
                            <p className={styles.roleDesc}>Create, manage, and sell tickets for your live events. Access powerful analytics and team management.</p>

                            <div className={styles.features}>
                                <div className={styles.feature}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    <span>Ticket Tier Management</span>
                                </div>
                                <div className={styles.feature}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    <span>Real-time Ticket Scanning</span>
                                </div>
                                <div className={styles.feature}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    <span>Revenue Dashboard</span>
                                </div>
                            </div>

                            {accountType === 'organizer' && (
                                <button className={styles.submitBtn} onClick={handleNext} style={{ marginTop: '32px' }}>
                                    Continue as Organizer
                                </button>
                            )}
                        </div>

                        {/* Advertiser Card */}
                        <div
                            className={`${styles.roleCard} ${styles.roleCardAds} ${accountType === 'advertiser' ? styles.roleCardActive : ''}`}
                            onClick={() => setAccountType('advertiser')}
                        >
                            <div className={styles.roleIcon} style={{ background: 'rgba(249, 201, 32, 0.1)', color: 'var(--color-brand-secondary)' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                    <path d="M2 17l10 5 10-5"></path>
                                    <path d="M2 12l10 5 10-5"></path>
                                </svg>
                            </div>
                            <h2 className={styles.roleName}>Advertiser</h2>
                            <p className={styles.roleDesc}>Promote your brand or events with high-impact ads across the Lynk-X discover feed and community forums.</p>

                            <div className={styles.features}>
                                <div className={styles.feature}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    <span>Campaign Builder</span>
                                </div>
                                <div className={styles.feature}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    <span>CTR & Impression tracking</span>
                                </div>
                                <div className={styles.feature}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    <span>Advanced Audience Targeting</span>
                                </div>
                            </div>

                            {accountType === 'advertiser' && (
                                <button className={styles.submitBtn} onClick={handleNext} style={{ marginTop: '32px', background: 'var(--color-brand-secondary)' }}>
                                    Continue as Advertiser
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {step === 'DETAILS' && (
                    <div className={styles.formCard}>
                        {error && (
                            <div className={styles.errorBox}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleCreateOrganization} className={styles.form}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="orgName" className={styles.label}>
                                    What's your identity?
                                    <span className={styles.charCount}>{orgName.length}/40</span>
                                </label>
                                <input
                                    id="orgName"
                                    type="text"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value.slice(0, 40))}
                                    placeholder={accountType === 'organizer' ? "e.g. Electric Vibes Events" : "e.g. Acme Marketing Agency"}
                                    className={styles.input}
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className={styles.actions}>
                                <button type="button" className={styles.backBtn} onClick={handleBack} disabled={loading}>
                                    Go Back
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={loading || !orgName.trim() || orgName.length < 3}
                                    style={accountType === 'advertiser' ? { background: 'var(--color-brand-secondary)' } : {}}
                                >
                                    {loading ? (
                                        <>
                                            <svg className={styles.spinner} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                                            Initializing...
                                        </>
                                    ) : (
                                        'Launch Workspace'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
