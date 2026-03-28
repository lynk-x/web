"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import { sanitizeInput } from '@/utils/sanitization';
import styles from './onboarding.module.css';

type OnboardingStep = 'ROLE_SELECTION' | 'DETAILS';
type AccountType = 'organizer' | 'advertiser';

function OnboardingFlow() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();
    const { refreshAccounts, accounts: allAccounts, isLoading: isLoadingOrg } = useOrganization();
    
    // Check if we are explicitly here to create a new workspace
    const isCreatingNew = searchParams.get('create') === 'true';

    // Auto-redirect if they already have an account (prevents returning users session issues)
    // ONLY redirect if they aren't explicitly trying to create a new one.
    useEffect(() => {
        if (!isLoadingOrg && !isCreatingNew && allAccounts.some(a => a.type !== 'attendee')) {
            console.log('[Onboarding] Business accounts found, redirecting to dashboard');
            router.replace('/dashboard');
        }
    }, [allAccounts, isLoadingOrg, isCreatingNew, router]);

    // Flow State
    const [step, setStep] = useState<OnboardingStep>('ROLE_SELECTION');
    const [accountType, setAccountType] = useState<AccountType>('organizer');

    // Form State
    const [orgName, setOrgName] = useState('');
    const [orgDesc, setOrgDesc] = useState('');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleNext = () => {
        setStep('DETAILS');
        setError(null);
    };

    const handleBack = () => {
        setStep('ROLE_SELECTION');
        setError(null);
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `org-${crypto.randomUUID()}.${fileExt}`;
            const filePath = `org-logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('profiles') // Assuming shared bucket
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('profiles')
                .getPublicUrl(filePath);

            setLogoUrl(publicUrl);
        } catch (err: any) {
            setError('Failed to upload logo.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();

        const cleanName = sanitizeInput(orgName.trim());
        const cleanDesc = sanitizeInput(orgDesc.trim());

        if (!cleanName) {
            setError('Organization name is required.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Create the account via RPC (handles account + default wallet + member row)
            const { data: accountId, error: rpcError } = await supabase.rpc('create_organization_account', {
                p_org_name: cleanName,
                p_account_type: accountType
            });

            if (rpcError) throw rpcError;

            // 2. Update additional branding (logo URL + description).
            if (logoUrl || cleanDesc) {
                const { error: updateError } = await supabase
                    .from('accounts')
                    .update({
                        ...(logoUrl ? { avatar_url: logoUrl } : {}),
                        ...(cleanDesc ? { description: cleanDesc } : {}),
                    })
                    .eq('id', accountId);

                if (updateError) console.error('Branding update failed (non-fatal):', updateError);
            }

            // 3. Refresh the global OrganizationContext so the new account appears in the switcher.
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
                        {step === 'ROLE_SELECTION' ? 'Choose Your Path' : 'Branding & Identity'}
                    </h1>
                    <p className={styles.subtitle}>
                        {step === 'ROLE_SELECTION'
                            ? 'Select the primary goal for your new workspace.'
                            : `Let's make your ${accountType === 'organizer' ? 'Organising' : 'Advertising'} brand stand out.`}
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
                            <p className={styles.roleDesc}>Create, manage, and sell tickets. Access powerful analytics and team management.</p>

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
                            <p className={styles.roleDesc}>Promote your brand with high-impact ads across the discovery feed.</p>

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
                        {error && <div className={styles.errorBox}>{error}</div>}

                        <form onSubmit={handleCreateOrganization} className={styles.form}>
                            {/* Logo Upload */}
                            <div className={styles.logoSection}>
                                <div className={styles.logoPreview} onClick={() => fileInputRef.current?.click()}>
                                    {logoUrl ? <img src={logoUrl} alt="Logo" /> : <div className={styles.plusIcon}>+</div>}
                                    <div className={styles.logoOverlay}>Upload Branding</div>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleLogoUpload} style={{ display: 'none' }} accept="image/*" />
                                <span className={styles.label}>Organization Logo</span>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Organization Name</label>
                                <input
                                    type="text"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    placeholder="e.g. Electric Vibes Events"
                                    className={styles.input}
                                    required
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Description (Optional)</label>
                                <textarea
                                    value={orgDesc}
                                    onChange={(e) => setOrgDesc(e.target.value)}
                                    placeholder="Briefly describe your organization..."
                                    className={styles.textarea}
                                    rows={3}
                                />
                            </div>

                            <div className={styles.actions}>
                                <button type="button" className={styles.backBtn} onClick={handleBack} disabled={loading}>
                                    Go Back
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={loading || !orgName.trim()}
                                    style={accountType === 'advertiser' ? { background: 'var(--color-brand-secondary)' } : {}}
                                >
                                    {loading ? 'Launching...' : 'Launch Workspace'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={
            <div className={styles.container}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div className={styles.spinner} style={{
                        width: '32px',
                        height: '32px',
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        borderTopColor: 'var(--color-brand-primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                </div>
            </div>
        }>
            <OnboardingFlow />
        </Suspense>
    );
}
