"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { sanitizeInput } from '@/utils/sanitization';
import { convertImageToWebP } from '@/utils/imageConversion';
import styles from './onboarding.module.css';
import { useCountries } from '@/hooks/useCountries';
import {
    KycRequirementsForm,
    kycRequirementsSatisfied,
    submitKycRequirements,
    type KycRequirement,
    type KycFileMap,
    type KycTextMap,
} from '@/components/features/kyc/KycRequirementsForm';

type OnboardingStep = 'DETAILS' | 'VERIFICATION';
type AccountType = 'organizer' | 'advertiser';

// Draft fields persisted across refresh/navigation. File selections (kycFiles)
// are NOT persisted — File objects aren't serializable and re-picking a few
// files is far cheaper than the alternative this replaces: re-running
// create_organization_account (which has no dedupe guard, unlike
// handle_new_user's own provisioning path) and creating a duplicate org.
interface OnboardingDraft {
    accountType: AccountType;
    step: OnboardingStep;
    orgName: string;
    orgDesc: string;
    country: string;
    logoUrl: string | null;
    accountId: string | null;
}

function draftKey(accountType: AccountType) {
    return `lynkx_onboarding_draft_${accountType}`;
}

function loadDraft(accountType: AccountType): Partial<OnboardingDraft> | null {
    try {
        const raw = sessionStorage.getItem(draftKey(accountType));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveDraft(accountType: AccountType, draft: OnboardingDraft) {
    try {
        sessionStorage.setItem(draftKey(accountType), JSON.stringify(draft));
    } catch {
        // Best-effort only — quota/private-mode failures shouldn't block onboarding.
    }
}

function clearDraft(accountType: AccountType) {
    try {
        sessionStorage.removeItem(draftKey(accountType));
    } catch {
        // no-op
    }
}

function OnboardingFlow() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();
    const { refreshAccounts, accounts: existingAccounts } = useOrganization();
    const { profile, isLoading: isLoadingAuth } = useAuth();
    const { countries, isLoading: isLoadingCountries } = useCountries();

    // ?type=organizer|advertiser  ?create=true (adding a new workspace)
    const typeParam = searchParams.get('type') as AccountType | null;
    const isCreatingNew = searchParams.get('create') === 'true';

    const resolvedAccountType = typeParam ?? 'organizer';
    const draft = typeof window !== 'undefined' ? loadDraft(resolvedAccountType) : null;

    const [step, setStep] = useState<OnboardingStep>(draft?.step ?? 'DETAILS');
    const [accountType, setAccountType] = useState<AccountType>(draft?.accountType ?? resolvedAccountType);

    // Form state — initialized from a persisted draft (if any) so a refresh
    // or dropped connection mid-flow doesn't force the user to start over.
    const [orgName, setOrgName] = useState(draft?.orgName ?? '');
    const [orgDesc, setOrgDesc] = useState(draft?.orgDesc ?? '');
    const [country, setCountry] = useState(draft?.country ?? '');
    const [logoUrl, setLogoUrl] = useState<string | null>(draft?.logoUrl ?? null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Set once create_organization_account succeeds. Its presence gates
    // handleCreateOrganization against calling that RPC a second time on
    // retry — the RPC has no idempotency guard, so re-calling it after a
    // refresh mid-KYC-upload would create a second, orphaned organization.
    const [accountId, setAccountId] = useState<string | null>(draft?.accountId ?? null);

    // KYC state. File selections are session-only (File objects aren't
    // serializable) — everything else survives a refresh via sessionStorage.
    const [kycRequirements, setKycRequirements] = useState<KycRequirement[]>([]);
    const [kycFiles, setKycFiles] = useState<KycFileMap>({});
    const [kycTextData, setKycTextData] = useState<KycTextMap>({});
    const [skipping, setSkipping] = useState(false);

    // Persist the resumable subset of form state on every change.
    useEffect(() => {
        saveDraft(accountType, { accountType, step, orgName, orgDesc, country, logoUrl, accountId });
    }, [accountType, step, orgName, orgDesc, country, logoUrl, accountId]);

    // Re-fetch KYC requirements if we resumed directly into VERIFICATION
    // (kycRequirements itself isn't persisted — it's cheap to refetch and
    // country/account type could theoretically have changed).
    useEffect(() => {
        if (step !== 'VERIFICATION' || kycRequirements.length > 0) return;
        supabase.schema('api').rpc('get_kyc_requirements', {
            p_country_code: country,
            p_account_type: accountType,
        }).then(({ data, error: fetchError }) => {
            if (!fetchError) setKycRequirements(data || []);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    // Redirect logged-in users who already have an account of this type,
    // unless they are explicitly creating a new one.
    useEffect(() => {
        if (isLoadingAuth || isCreatingNew) return;
        
        // If they already have an account of this type, redirect to its dashboard
        const existingAccount = existingAccounts.find(a => a.type === accountType);
        if (existingAccount) {
            const dashType = accountType === 'advertiser' ? 'ads' : 'organize';
            router.push(`/${dashType}/${existingAccount.slug || existingAccount.id}/dashboard`);
        }
    }, [isCreatingNew, existingAccounts, accountType, router, isLoadingAuth]);

    // Automatically select the first country in the list once they finish loading
    useEffect(() => {
        if (!isLoadingCountries && !country) {
            if (countries.length > 0) {
                setCountry(countries[0].code);
            } else {
                setCountry('');
            }
        }
    }, [isLoadingCountries, countries, country]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawFile = e.target.files?.[0];
        if (!rawFile) return;
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                return;
            }
            const file = await convertImageToWebP(rawFile);
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}_org-logo.${fileExt}`;

            const { data: signData, error: signError } = await supabase.functions.invoke('media-signer', {
                body: {
                    action: 'upload',
                    folder: 'avatars',
                    filename: fileName,
                    contentType: file.type,
                    mediaType: 'image',
                }
            });

            if (signError || !signData?.uploadUrl) {
                throw new Error(signError?.message || 'Failed to get upload URL');
            }

            const putResponse = await fetch(signData.uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type,
                },
                body: file,
            });

            if (!putResponse.ok) {
                throw new Error('Failed to upload logo to R2');
            }

            setLogoUrl(signData.fileUrl);
        } catch {
            setError('Failed to upload logo.');
        } finally {
            setLoading(false);
        }
    };

    const handleProceedToVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanName = sanitizeInput(orgName.trim());
        if (!cleanName) { setError('Organization name is required.'); return; }

        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase.schema('api').rpc('get_kyc_requirements', {
                p_country_code: country,
                p_account_type: accountType
            });
            if (fetchError) throw fetchError;
            setKycRequirements(data || []);
            setStep('VERIFICATION');
        } catch (err) {
            console.error('Error fetching KYC requirements:', err);
            setError('Failed to fetch verification requirements for your country.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrganization = async (e?: React.FormEvent | null, isSkipAction = false) => {
        if (e) e.preventDefault();

        // Ensure the user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
            return;
        }

        const cleanName = sanitizeInput(orgName.trim());
        const cleanDesc = sanitizeInput(orgDesc.trim());
        if (!cleanName) { setError('Organization name is required.'); return; }

        if (isSkipAction) setSkipping(true);
        else setLoading(true);
        setError(null);

        try {
            // If a prior attempt already created the org (e.g. this attempt is
            // a retry after a network drop during KYC upload), reuse that id
            // instead of calling create_organization_account again —
            // the RPC has no dedupe guard and would create a second, orphaned
            // organization on every retry.
            let currentAccountId = accountId;
            if (!currentAccountId) {
                const { data: newAccountId, error: rpcError } = await supabase.schema('api').rpc('create_organization_account', {
                    p_org_name: cleanName,
                    p_account_type: accountType,
                    p_country_code: country || null,
                });
                if (rpcError) throw rpcError;
                currentAccountId = newAccountId;
                // Persist immediately — if anything below throws, the retry
                // path above will find this and skip re-creating the org.
                setAccountId(currentAccountId);

                if (logoUrl || cleanDesc || country) {
                    if (logoUrl || country) {
                        const { error: updateError } = await supabase
                            .schema('api' as any)
                            .from('v1_accounts')
                            .update({
                                ...(logoUrl ? { media: { logo: logoUrl } } : {}),
                                ...(country ? { country_code: country } : {}),
                            })
                            .eq('id', currentAccountId);
                        if (updateError) console.error('Branding metadata update failed (non-fatal):', updateError);
                    }
                    if (cleanDesc) {
                        const { error: rpcUpdateError } = await supabase.schema('api').rpc('update_account_settings', {
                            p_account_id: currentAccountId,
                            p_display_name: null,
                            p_info: { description: cleanDesc }
                        });
                        if (rpcUpdateError) console.error('Branding description update failed (non-fatal):', rpcUpdateError);
                    }
                }
            }

            if (!currentAccountId) throw new Error('Organization could not be created. Please try again.');

            await submitKycRequirements(supabase, currentAccountId, kycRequirements, kycFiles, kycTextData);

            // Refresh context and set active account
            let memberships = await refreshAccounts();
            if (!memberships.some((m: any) => m.id === currentAccountId)) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                memberships = await refreshAccounts();
            }
            localStorage.setItem('lynks_active_account_id', currentAccountId);

            clearDraft(accountType);

            // Redirect to the dashboard for the new account type
            const dashType = accountType === 'advertiser' ? 'ads' : 'organize';
            window.location.href = `/dashboard/${dashType}`;
        } catch (err: unknown) {
            console.error('Error creating organization:', err);
            setError(getErrorMessage(err) || 'Failed to create organization. Please try again.');
            setLoading(false);
            setSkipping(false);
        }
    };

    const isAdvertiser = accountType === 'advertiser';
    const accentColor = isAdvertiser ? 'var(--color-brand-secondary)' : 'var(--color-brand-primary)';
    const accentBg = isAdvertiser ? 'rgba(249, 201, 32, 0.1)' : 'rgba(32, 249, 40, 0.1)';

    return (
        <div className={styles.container}>
            <div className={styles.onboardingWrapper}>
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        {step === 'DETAILS' ? 'Set Up Your Workspace' : 'Identity Verification'}
                    </h1>
                    <p className={styles.subtitle}>
                        {step === 'DETAILS'
                            ? `Let's get your ${isAdvertiser ? 'Advertising' : 'Organiser'} brand ready.`
                            : 'Upload your identification documents to verify your account.'}
                    </p>
                </div>

                <div className={styles.stepIndicator}>
                    <div className={`${styles.stepDot} ${step === 'DETAILS' ? styles.stepDotActive : ''}`} />
                    <div className={`${styles.stepDot} ${step === 'VERIFICATION' ? styles.stepDotActive : ''}`} />
                </div>

                {step === 'DETAILS' && (
                    <div className={styles.formCard}>
                        <form onSubmit={handleProceedToVerification} className={styles.form}>
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
                                <label className={styles.label}>Operating Country</label>
                                <select
                                    className={styles.input}
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    style={{ background: 'rgba(0, 0, 0, 0.4)' }}
                                    disabled={isLoadingCountries}
                                >
                                    {isLoadingCountries ? (
                                        <option value="">Loading Countries...</option>
                                    ) : (
                                        countries.map(c => (
                                            <option key={c.code} value={c.code}>{c.display_name}</option>
                                        ))
                                    )}
                                    {!isLoadingCountries && countries.length === 0 && (
                                        <option value="KE">Kenya</option>
                                    )}
                                </select>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Organization Name</label>
                                <input
                                    type="text"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    placeholder={isAdvertiser ? 'e.g. Acme Media' : 'e.g. Electric Vibes Events'}
                                    className={styles.input}
                                    required
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Description <span style={{ fontSize: '12px', opacity: 0.5 }}>(Optional)</span></label>
                                <textarea
                                    value={orgDesc}
                                    onChange={(e) => setOrgDesc(e.target.value)}
                                    placeholder="Briefly describe your organization..."
                                    className={styles.textarea}
                                    rows={3}
                                />
                            </div>

                            <div className={styles.actions}>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={loading || !orgName.trim()}
                                    style={{ background: accentColor }}
                                >
                                    {loading ? 'Processing...' : 'Continue to Verification'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {step === 'VERIFICATION' && (
                    <div className={styles.formCard}>
                        {error && <div className={styles.errorBox}>{error}</div>}

                        <form onSubmit={(e) => handleCreateOrganization(e)} className={styles.form}>
                            <KycRequirementsForm
                                requirements={kycRequirements}
                                files={kycFiles}
                                textValues={kycTextData}
                                onFilesChange={setKycFiles}
                                onTextValuesChange={setKycTextData}
                                emptyStateHint="You can proceed to launch your workspace."
                            />

                            <div className={styles.actions}>
                                <button type="button" className={styles.backBtn} onClick={() => { setStep('DETAILS'); setError(null); }} disabled={loading}>
                                    Go Back
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={loading || !kycRequirementsSatisfied(kycRequirements, kycFiles, kycTextData)}
                                    style={{ background: accentColor }}
                                >
                                    {loading ? 'Processing...' : 'Complete & Launch'}
                                </button>
                            </div>

                            <button
                                type="button"
                                className={styles.skipBtn}
                                onClick={() => handleCreateOrganization(null, true)}
                                disabled={loading || skipping}
                            >
                                {skipping ? 'Redirecting...' : 'Skip for now (Limited access)'}
                            </button>
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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{
                    width: '32px', height: '32px',
                    border: '2px solid rgba(255,255,255,0.1)',
                    borderTopColor: 'var(--color-brand-primary)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
            </div>
        }>
            <OnboardingFlow />
        </Suspense>
    );
}
