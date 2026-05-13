"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import { sanitizeInput } from '@/utils/sanitization';
import styles from './onboarding.module.css';
import { useCountries } from '@/hooks/useCountries';

type OnboardingStep = 'DETAILS' | 'VERIFICATION';
type AccountType = 'organizer' | 'advertiser';

interface KycRequirement {
    id: string;
    type: 'file' | 'text';
    label: string;
    subtype?: string;
    mandatory: boolean;
}

function OnboardingFlow() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();
    const { refreshAccounts } = useOrganization();
    const { countries, isLoading: isLoadingCountries } = useCountries();

    // ?type=organizer|advertiser  ?create=true (adding a new workspace)
    const typeParam = searchParams.get('type') as AccountType | null;
    const isCreatingNew = searchParams.get('create') === 'true';

    const [step, setStep] = useState<OnboardingStep>('DETAILS');
    const [accountType, setAccountType] = useState<AccountType>(typeParam ?? 'organizer');

    // Form state
    const [orgName, setOrgName] = useState('');
    const [orgDesc, setOrgDesc] = useState('');
    const [country, setCountry] = useState('KE');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // KYC state
    const [kycRequirements, setKycRequirements] = useState<KycRequirement[]>([]);
    const [kycFiles, setKycFiles] = useState<Record<string, { file: File; preview: string }[]>>({});
    const [skipping, setSkipping] = useState(false);
    const kycFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Redirect logged-in users who already have an account of this type,
    // unless they are explicitly creating a new one.
    useEffect(() => {
        if (isCreatingNew) return;
        // No redirect here — the dashboard page handles the "already has account" redirect.
        // Onboarding is now publicly accessible; users who aren't logged in will hit the
        // auth check inside handleCreateOrganization.
    }, [isCreatingNew]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                return;
            }
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/org-logo.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            setLogoUrl(publicUrl);
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
            const { data, error: fetchError } = await supabase.rpc('get_kyc_requirements', {
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

        // Ensure the user is authenticated before creating an account
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
            const { data: accountId, error: rpcError } = await supabase.rpc('create_organization_account', {
                p_org_name: cleanName,
                p_account_type: accountType,
            });
            if (rpcError) throw rpcError;

            if (logoUrl || cleanDesc || country) {
                const { error: updateError } = await supabase
                    .from('accounts')
                    .update({
                        ...(logoUrl ? { media: { logo: logoUrl } } : {}),
                        ...(cleanDesc ? { info: { description: cleanDesc } } : {}),
                        ...(country ? { country_code: country } : {}),
                    })
                    .eq('id', accountId);
                if (updateError) console.error('Branding update failed (non-fatal):', updateError);
            }

            // Upload KYC documents for each requirement
            for (const req of kycRequirements) {
                const files = kycFiles[req.id];
                if (!files || files.length === 0) continue;

                const uploadedPaths: string[] = [];
                for (const item of files) {
                    const fileExt = item.file.name.split('.').pop();
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage
                        .from('accounts')
                        .upload(`${accountId}/kyc/${req.id}/${fileName}`, item.file);
                    
                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('accounts')
                            .getPublicUrl(`${accountId}/kyc/${req.id}/${fileName}`);
                        uploadedPaths.push(publicUrl);
                    }
                }

                if (uploadedPaths.length > 0) {
                    await supabase.rpc('submit_identity_verification', {
                        p_account_id: accountId,
                        p_document_type: (req.subtype || req.id) as any, // Cast to kyc_document_type
                        p_uploaded_docs: uploadedPaths,
                        p_pii_data: { requirement_id: req.id }
                    });
                }
            }

            // Refresh context and set active account
            let memberships = await refreshAccounts();
            if (!memberships.some((m: any) => m.id === accountId)) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                memberships = await refreshAccounts();
            }
            if (accountId) localStorage.setItem('lynks_active_account_id', accountId);

            const newAccount = memberships.find((m: any) => m.id === accountId);
            const accountRef = newAccount?.slug || accountId;

            // Redirect to user profile setup, then dashboard
            const dashType = accountType === 'advertiser' ? 'ads' : 'organize';
            window.location.href = `/setup-profile?type=${dashType}&accountRef=${accountRef}`;
        } catch (err: unknown) {
            console.error('Error creating organization:', err);
            setError(getErrorMessage(err) || 'Failed to create organization. Please try again.');
            setLoading(false);
            setSkipping(false);
        }
    };

    const handleKycFileChange = (reqId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        setKycFiles(prev => ({
            ...prev,
            [reqId]: [
                ...(prev[reqId] || []),
                ...Array.from(files).map(file => ({ file, preview: URL.createObjectURL(file) })),
            ]
        }));
    };

    const removeKycFile = (reqId: string, index: number) => {
        setKycFiles(prev => {
            const nextFiles = [...(prev[reqId] || [])];
            URL.revokeObjectURL(nextFiles[index].preview);
            nextFiles.splice(index, 1);
            return { ...prev, [reqId]: nextFiles };
        });
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

                {/* Account type toggle — only shown when no type was passed via URL */}
                {!typeParam && (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
                        <button
                            onClick={() => setAccountType('organizer')}
                            className={styles.backBtn}
                            style={!isAdvertiser ? { borderColor: accentColor, color: accentColor } : {}}
                        >
                            Event Organizer
                        </button>
                        <button
                            onClick={() => setAccountType('advertiser')}
                            className={styles.backBtn}
                            style={isAdvertiser ? { borderColor: accentColor, color: accentColor } : {}}
                        >
                            Advertiser
                        </button>
                    </div>
                )}

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
                            {kycRequirements.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px', opacity: 0.6 }}>
                                    <p>No specific verification requirements for your country.</p>
                                    <p style={{ fontSize: '12px' }}>You can proceed to launch your workspace.</p>
                                </div>
                            ) : (
                                kycRequirements.map((req) => (
                                    <div key={req.id} className={styles.inputGroup}>
                                        <label className={styles.label}>
                                            {req.label} {req.mandatory && <span className={styles.requiredIndicator}>*Required</span>}
                                        </label>
                                        
                                        {req.type === 'file' ? (
                                            <>
                                                <div className={styles.kycUploadArea} onClick={() => kycFileInputRefs.current[req.id]?.click()}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: '8px', opacity: 0.5 }}>
                                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                                                        </svg>
                                                        <p style={{ fontSize: '14px', opacity: 0.8 }}>Click to upload {req.label.toLowerCase()}</p>
                                                        <p style={{ fontSize: '11px', opacity: 0.4, marginTop: '4px' }}>PNG, JPG or PDF up to 10MB</p>
                                                    </div>
                                                </div>
                                                <input
                                                    type="file"
                                                    multiple
                                                    ref={el => { kycFileInputRefs.current[req.id] = el; }}
                                                    onChange={(e) => handleKycFileChange(req.id, e)}
                                                    style={{ display: 'none' }}
                                                    accept="image/*,application/pdf"
                                                />

                                                {(kycFiles[req.id] || []).length > 0 && (
                                                    <div className={styles.fileList}>
                                                        {kycFiles[req.id].map((item, idx) => (
                                                            <div key={idx} className={styles.fileItem}>
                                                                <div className={styles.filePreview}>
                                                                    {item.file.type.startsWith('image/') ? (
                                                                        <img src={item.preview} alt="preview" />
                                                                    ) : (
                                                                        <div className={styles.pdfIcon}>PDF</div>
                                                                    )}
                                                                </div>
                                                                <span className={styles.fileName}>{item.file.name}</span>
                                                                <button type="button" className={styles.removeFile} onClick={() => removeKycFile(req.id, idx)}>×</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <input 
                                                type="text" 
                                                className={styles.input} 
                                                placeholder={`Enter ${req.label.toLowerCase()}...`}
                                                required={req.mandatory}
                                            />
                                        )}
                                    </div>
                                ))
                            )}

                            <div className={styles.actions}>
                                <button type="button" className={styles.backBtn} onClick={() => { setStep('DETAILS'); setError(null); }} disabled={loading}>
                                    Go Back
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={loading || (kycRequirements.some(r => r.mandatory && (!kycFiles[r.id] || kycFiles[r.id].length === 0)))}
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
