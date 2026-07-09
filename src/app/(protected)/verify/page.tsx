"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import {
    KycRequirementsForm,
    kycRequirementsSatisfied,
    submitKycRequirements,
    type KycRequirement,
    type KycFileMap,
    type KycTextMap,
} from '@/components/features/kyc/KycRequirementsForm';
import styles from './verify.module.css';

function VerifyFlow() {
    const router = useRouter();
    const supabase = createClient();
    const { activeAccount, isLoading } = useOrganization();

    const [step, setStep] = useState<'info' | 'documents' | 'confirm'>('info');
    const [kycRequirements, setKycRequirements] = useState<KycRequirement[]>([]);
    const [kycFiles, setKycFiles] = useState<KycFileMap>({});
    const [kycTextData, setKycTextData] = useState<KycTextMap>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFetchingReqs, setIsFetchingReqs] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);
    const [consentAccepted, setConsentAccepted] = useState(false);
    const [accuracyConfirmed, setAccuracyConfirmed] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            if (!activeAccount) {
                // If there's no active account, we shouldn't be here. Redirect to dashboard
                router.push('/dashboard');
                return;
            }

            const fetchRequirements = async () => {
                setIsFetchingReqs(true);
                try {
                    const [{ data, error: fetchError }, { data: statusData }] = await Promise.all([
                        supabase.schema('api').rpc('get_kyc_requirements', {
                            p_country_code: activeAccount.country_code || 'KE', // Fallback to KE if null
                            p_account_type: activeAccount.type
                        }),
                        supabase.schema('api').rpc('get_account_kyc_status', {
                            p_account_id: activeAccount.id
                        }),
                    ]);
                    if (fetchError) throw fetchError;
                    setKycRequirements(data || []);
                    if (statusData?.status === 'rejected' && statusData.rejection_reason) {
                        setRejectionReason(statusData.rejection_reason);
                    }
                } catch (err) {
                    console.error('Error fetching KYC requirements:', err);
                    setError('Failed to fetch verification requirements for your country.');
                } finally {
                    setIsFetchingReqs(false);
                }
            };

            fetchRequirements();
        }
    }, [isLoading, activeAccount, supabase, router]);


    const textRequirements = kycRequirements.filter(r => r.type === 'text');
    const fileRequirements = kycRequirements.filter(r => r.type === 'file');

    const handleContinueToDocuments = (e: React.FormEvent) => {
        e.preventDefault();
        setStep('documents');
    };

    const handleContinueToConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        setStep('confirm');
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAccount || !consentAccepted || !accuracyConfirmed) return;

        setLoading(true);
        setError(null);

        try {
            await submitKycRequirements(supabase, activeAccount.id, kycRequirements, kycFiles, kycTextData, 'tier_1_basic', {
                data_processing_consent: true,
                data_accuracy_confirmed: true,
            });
            setSubmitted(true);
            setLoading(false);
        } catch (err: unknown) {
            console.error('Error submitting verification:', err);
            setError(getErrorMessage(err) || 'Failed to submit verification. Please try again.');
            setLoading(false);
        }
    };

    const handleContinue = () => {
        const dashType = activeAccount?.type === 'advertiser' ? 'ads' : 'organize';
        window.location.href = `/dashboard/${dashType}/settings`;
    };

    if (submitted) {
        return (
            <div className={styles.container}>
                <div className={styles.onboardingWrapper}>
                    <div className={styles.formCard}>
                        <div className={styles.successCard}>
                            <div className={styles.successIconWrap}>
                                <svg className={styles.successIcon} width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                            </div>
                            <h2 className={styles.successTitle}>Documents Submitted</h2>
                            <p className={styles.successDesc}>
                                Your verification is now pending review. This usually takes 1-2 business days —
                                we&apos;ll notify you once a decision has been made. You can check your status anytime
                                from Account Settings.
                            </p>
                            <button type="button" className={styles.continueBtn} onClick={handleContinue}>
                                Continue to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading || isFetchingReqs) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div className={styles.spinner} style={{
                    width: '32px', height: '32px',
                    border: '2px solid rgba(255,255,255,0.1)',
                    borderTopColor: 'var(--color-brand-primary)',
                    borderRadius: '50%'
                }} />
            </div>
        );
    }

    const isAdvertiser = activeAccount?.type === 'advertiser';
    const accentColor = isAdvertiser ? 'var(--color-brand-secondary)' : 'var(--color-brand-primary)';

    return (
        <div className={styles.container}>
            <div className={styles.onboardingWrapper}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Identity Verification</h1>
                    <p className={styles.subtitle}>
                        {step === 'info' && 'Tell us a few details before uploading your documents.'}
                        {step === 'documents' && 'Upload your identification documents to verify your account.'}
                        {step === 'confirm' && 'Review your submission before sending it for verification.'}
                    </p>
                </div>

                <div className={styles.stepIndicator}>
                    <div className={`${styles.stepDot} ${styles.stepDotActive}`}>
                        <span>1</span>
                    </div>
                    <span className={styles.stepLabel}>Your Info</span>
                    <div className={`${styles.stepLine} ${step === 'documents' || step === 'confirm' ? styles.stepLineActive : ''}`} />
                    <div className={`${styles.stepDot} ${step === 'documents' || step === 'confirm' ? styles.stepDotActive : ''}`}>
                        <span>2</span>
                    </div>
                    <span className={styles.stepLabel}>Documents</span>
                    <div className={`${styles.stepLine} ${step === 'confirm' ? styles.stepLineActive : ''}`} />
                    <div className={`${styles.stepDot} ${step === 'confirm' ? styles.stepDotActive : ''}`}>
                        <span>3</span>
                    </div>
                    <span className={styles.stepLabel}>Confirm</span>
                </div>

                <div className={styles.formCard}>
                    {rejectionReason && (
                        <div className={styles.rejectionBanner}>
                            <strong>Your previous submission was rejected:</strong>
                            <p>{rejectionReason}</p>
                            <span>Please address the issue above before resubmitting.</span>
                        </div>
                    )}
                    {error && <div className={styles.errorBox}>{error}</div>}

                    {step === 'info' ? (
                        <form onSubmit={handleContinueToDocuments} className={styles.form}>
                            <KycRequirementsForm
                                requirements={textRequirements}
                                files={kycFiles}
                                textValues={kycTextData}
                                onFilesChange={setKycFiles}
                                onTextValuesChange={setKycTextData}
                                emptyStateHint="No additional information needed — continue to documents."
                            />

                            <div className={styles.actions}>
                                <button type="button" className={styles.backBtn} onClick={() => router.back()} disabled={loading}>
                                    Go Back
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={!kycRequirementsSatisfied(textRequirements, kycFiles, kycTextData)}
                                    style={{ background: accentColor }}
                                >
                                    Continue
                                </button>
                            </div>
                        </form>
                    ) : step === 'documents' ? (
                        <form onSubmit={handleContinueToConfirm} className={styles.form}>
                            <KycRequirementsForm
                                requirements={fileRequirements}
                                files={kycFiles}
                                textValues={kycTextData}
                                onFilesChange={setKycFiles}
                                onTextValuesChange={setKycTextData}
                                emptyStateHint="You are good to go!"
                            />

                            <div className={styles.actions}>
                                <button type="button" className={styles.backBtn} onClick={() => setStep('info')} disabled={loading}>
                                    Go Back
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={!kycRequirementsSatisfied(fileRequirements, kycFiles, kycTextData)}
                                    style={{ background: accentColor }}
                                >
                                    Continue
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerify} className={styles.form}>
                            <div className={styles.confirmSection}>
                                <h3 className={styles.confirmTitle}>Review &amp; Confirm</h3>
                                <p className={styles.confirmSubtitle}>
                                    Please confirm the following before we submit your verification for review.
                                </p>

                                <label className={styles.checkboxRow}>
                                    <input
                                        type="checkbox"
                                        checked={accuracyConfirmed}
                                        onChange={(e) => setAccuracyConfirmed(e.target.checked)}
                                    />
                                    <span>
                                        I confirm that the documents and information I submitted are accurate,
                                        genuinely mine and match the identity I am verifying.
                                    </span>
                                </label>

                                <label className={styles.checkboxRow}>
                                    <input
                                        type="checkbox"
                                        checked={consentAccepted}
                                        onChange={(e) => setConsentAccepted(e.target.checked)}
                                    />
                                    <span>
                                        I consent to Lynk-X processing and securely storing this data for the
                                        purpose of identity verification, in line with the Privacy Policy.
                                    </span>
                                </label>
                            </div>

                            <div className={styles.actions}>
                                <button type="button" className={styles.backBtn} onClick={() => setStep('documents')} disabled={loading}>
                                    Go Back
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={loading || !consentAccepted || !accuracyConfirmed}
                                    style={{ background: accentColor }}
                                >
                                    {loading ? 'Processing...' : 'Submit Documents'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function VerifyPage() {
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
            <VerifyFlow />
        </Suspense>
    );
}
