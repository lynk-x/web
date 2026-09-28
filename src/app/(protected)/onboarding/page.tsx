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

type AccountType = 'organizer' | 'advertiser';

// Draft fields persisted across refresh/navigation.
interface OnboardingDraft {
    accountType: AccountType;
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
    // dropped connection would create a second, orphaned organization.
    const [accountId, setAccountId] = useState<string | null>(draft?.accountId ?? null);

    // Persist the resumable subset of form state on every change.
    useEffect(() => {
        saveDraft(accountType, { accountType, orgName, orgDesc, country, logoUrl, accountId });
    }, [accountType, orgName, orgDesc, country, logoUrl, accountId]);

    // Redirect logged-in users who already have an account of this type,
    // unless they are explicitly creating a new one.
    useEffect(() => {
        if (isLoadingAuth || isCreatingNew) return;
        
        // If they already have an account of this type, redirect to its dashboard
        const existingAccount = existingAccounts.find(a => a.type === accountType);
        if (existingAccount) {
            const dashType = accountType === 'advertiser' ? 'ads' : 'organize';
            router.push(`/dashboard/${dashType}`);
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

    const handleCreateOrganization = async (e?: React.FormEvent | null) => {
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

        setLoading(true);
        setError(null);

        try {
            // If a prior attempt already created the org (e.g. this attempt is
            // a retry after a dropped connection) reuse that id instead of
            // calling create_organization_account again — the RPC has no
            // dedupe guard and would create a second, orphaned organization
            // on every retry.
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
                            p_info: { profile: { description: cleanDesc } }
                        });
                        if (rpcUpdateError) console.error('Branding description update failed (non-fatal):', rpcUpdateError);
                    }
                }
            }

            if (!currentAccountId) throw new Error('Organization could not be created. Please try again.');

            // No KYC step here — identity verification is deferred until the
            // organizer actually needs it (creating a paid ticket tier or
            // requesting a payout), prompted from /verify at that point.
            // See api.upsert_organizer_event's can_create_paid_events check.

            // Refresh context and set active account
            let memberships = await refreshAccounts();
            if (!memberships.some((m: any) => m.id === currentAccountId)) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                memberships = await refreshAccounts();
            }
            localStorage.setItem('lynks_active_account_id', currentAccountId);

            clearDraft(accountType);

            // Redirect to the dashboard for the new account type. A client-side
            // push (not a full reload) since refreshAccounts() above already
            // re-hydrated OrganizationContext with the new membership.
            const dashType = accountType === 'advertiser' ? 'ads' : 'organize';
            router.push(`/dashboard/${dashType}`);
        } catch (err: unknown) {
            console.error('Error creating organization:', err);
            setError(getErrorMessage(err) || 'Failed to create organization. Please try again.');
            setLoading(false);
        }
    };

    const isAdvertiser = accountType === 'advertiser';
    const accentColor = isAdvertiser ? 'var(--color-brand-secondary)' : 'var(--color-brand-primary)';
    const accentBg = isAdvertiser ? 'rgba(249, 201, 32, 0.1)' : 'rgba(32, 249, 40, 0.1)';

    return (
        <div className={styles.container}>
            <div className={styles.onboardingWrapper}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Set Up Your Workspace</h1>
                    <p className={styles.subtitle}>
                        Let&apos;s get your {isAdvertiser ? 'Advertising' : 'Organiser'} brand ready.
                    </p>
                </div>

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
                                {loading ? 'Processing...' : 'Launch Workspace'}
                            </button>
                        </div>
                    </form>
                </div>
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
