"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import styles from './verify.module.css';

interface KycRequirement {
    id: string;
    type: 'file' | 'text';
    label: string;
    subtype?: string;
    mandatory: boolean;
}

function VerifyFlow() {
    const router = useRouter();
    const supabase = createClient();
    const { activeAccount, isLoading } = useOrganization();

    const [kycRequirements, setKycRequirements] = useState<KycRequirement[]>([]);
    const [kycFiles, setKycFiles] = useState<Record<string, { file: File; preview: string }[]>>({});
    const [kycTextData, setKycTextData] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFetchingReqs, setIsFetchingReqs] = useState(true);

    const kycFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
                    const { data, error: fetchError } = await supabase.rpc('get_kyc_requirements', {
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

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAccount) return;

        setLoading(true);
        setError(null);

        try {
            const accountId = activeAccount.id;

            // Upload KYC documents and text for each requirement
            for (const req of kycRequirements) {
                if (req.type === 'file') {
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
                } else if (req.type === 'text') {
                    const textValue = kycTextData[req.id];
                    if (!textValue || textValue.trim() === '') continue;

                    await supabase.rpc('submit_identity_verification', {
                        p_account_id: accountId,
                        p_document_type: (req.subtype || req.id) as any,
                        p_uploaded_docs: [],
                        p_pii_data: { requirement_id: req.id, value: textValue.trim() }
                    });
                }
            }

            // Redirect back to dashboard based on account type
            const dashType = activeAccount.type === 'advertiser' ? 'ads' : 'organize';
            const dashRef = activeAccount.slug || activeAccount.id;
            window.location.href = `/dashboard/${dashType}/${dashRef}/dashboard`;
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
                        {kycRequirements.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px', opacity: 0.6 }}>
                                <p>No specific verification requirements for your country.</p>
                                <p style={{ fontSize: '12px' }}>You are good to go!</p>
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
                                            value={kycTextData[req.id] || ''}
                                            onChange={(e) => setKycTextData(prev => ({ ...prev, [req.id]: e.target.value }))}
                                        />
                                    )}
                                </div>
                            ))
                        )}

                        <div className={styles.actions}>
                            <button type="button" className={styles.backBtn} onClick={() => router.back()} disabled={loading}>
                                Go Back
                            </button>
                            {kycRequirements.length > 0 && (
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={loading || (kycRequirements.some(r => r.mandatory && (
                                        (r.type === 'file' && (!kycFiles[r.id] || kycFiles[r.id].length === 0)) ||
                                        (r.type === 'text' && (!kycTextData[r.id] || kycTextData[r.id].trim() === ''))
                                    )))}
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
