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

    const [kycRequirements, setKycRequirements] = useState<KycRequirement[]>([]);
    const [kycFiles, setKycFiles] = useState<KycFileMap>({});
    const [kycTextData, setKycTextData] = useState<KycTextMap>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFetchingReqs, setIsFetchingReqs] = useState(true);

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
                    const { data, error: fetchError } = await supabase.schema('api').rpc('get_kyc_requirements', {
                        p_country_code: activeAccount.country_code || 'KE', // Fallback to KE if null
                        p_account_type: activeAccount.type
                    });
                    if (fetchError) throw fetchError;
                    setKycRequirements(data || []);
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


    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAccount) return;

        setLoading(true);
        setError(null);

        try {
            await submitKycRequirements(supabase, activeAccount.id, kycRequirements, kycFiles, kycTextData);

            // Redirect back to settings based on account type
            const dashType = activeAccount.type === 'advertiser' ? 'ads' : 'organize';
            window.location.href = `/dashboard/${dashType}/settings`;
        } catch (err: unknown) {
            console.error('Error submitting verification:', err);
            setError(getErrorMessage(err) || 'Failed to submit verification. Please try again.');
            setLoading(false);
        }
    };

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
                        Upload your identification documents to verify your account.
                    </p>
                </div>

                <div className={styles.formCard}>
                    {error && <div className={styles.errorBox}>{error}</div>}

                    <form onSubmit={handleVerify} className={styles.form}>
                        <KycRequirementsForm
                            requirements={kycRequirements}
                            files={kycFiles}
                            textValues={kycTextData}
                            onFilesChange={setKycFiles}
                            onTextValuesChange={setKycTextData}
                            emptyStateHint="You are good to go!"
                        />

                        <div className={styles.actions}>
                            <button type="button" className={styles.backBtn} onClick={() => router.back()} disabled={loading}>
                                Go Back
                            </button>
                            {kycRequirements.length > 0 && (
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={loading || !kycRequirementsSatisfied(kycRequirements, kycFiles, kycTextData)}
                                    style={{ background: accentColor }}
                                >
                                    {loading ? 'Processing...' : 'Submit Documents'}
                                </button>
                            )}
                        </div>
                    </form>
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
