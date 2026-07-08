"use client";

import { useRef } from 'react';
import styles from './KycRequirementsForm.module.css';

export interface KycRequirement {
    id: string;
    type: 'file' | 'text';
    label: string;
    subtype?: string;
    mandatory: boolean;
}

export type KycFileMap = Record<string, { file: File; preview: string }[]>;
export type KycTextMap = Record<string, string>;

interface KycRequirementsFormProps {
    requirements: KycRequirement[];
    files: KycFileMap;
    textValues: KycTextMap;
    onFilesChange: (files: KycFileMap) => void;
    onTextValuesChange: (values: KycTextMap) => void;
    emptyStateHint?: string;
}

/**
 * Renders the file/text requirement inputs for an identity-verification
 * step. Shared between (protected)/onboarding (initial workspace setup) and
 * (protected)/verify (re-verification from settings) — these two pages
 * previously carried near-identical copies of this exact upload UI.
 *
 * State is lifted to the caller so each page can persist kycFiles/
 * kycTextData as part of its own draft-recovery logic.
 */
export function KycRequirementsForm({
    requirements,
    files,
    textValues,
    onFilesChange,
    onTextValuesChange,
    emptyStateHint = 'You can proceed to launch your workspace.',
}: KycRequirementsFormProps) {
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const handleFileChange = (reqId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files;
        if (!selected) return;
        onFilesChange({
            ...files,
            [reqId]: [
                ...(files[reqId] || []),
                ...Array.from(selected).map(file => ({ file, preview: URL.createObjectURL(file) })),
            ],
        });
    };

    const removeFile = (reqId: string, index: number) => {
        const nextFiles = [...(files[reqId] || [])];
        URL.revokeObjectURL(nextFiles[index].preview);
        nextFiles.splice(index, 1);
        onFilesChange({ ...files, [reqId]: nextFiles });
    };

    if (requirements.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>No specific verification requirements for your country.</p>
                <p style={{ fontSize: '12px' }}>{emptyStateHint}</p>
            </div>
        );
    }

    return (
        <>
            {requirements.map((req) => (
                <div key={req.id} className={styles.inputGroup}>
                    <label className={styles.label}>
                        {req.label} {req.mandatory && <span className={styles.requiredIndicator}>*Required</span>}
                    </label>

                    {req.type === 'file' ? (
                        <>
                            <div
                                className={styles.kycUploadArea}
                                onClick={() => fileInputRefs.current[req.id]?.click()}
                            >
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
                                ref={el => { fileInputRefs.current[req.id] = el; }}
                                onChange={(e) => handleFileChange(req.id, e)}
                                style={{ display: 'none' }}
                                accept="image/*,application/pdf"
                            />

                            {(files[req.id] || []).length > 0 && (
                                <div className={styles.fileList}>
                                    {files[req.id].map((item, idx) => (
                                        <div key={idx} className={styles.fileItem}>
                                            <div className={styles.filePreview}>
                                                {item.file.type.startsWith('image/') ? (
                                                    <img src={item.preview} alt="preview" />
                                                ) : (
                                                    <div className={styles.pdfIcon}>PDF</div>
                                                )}
                                            </div>
                                            <span className={styles.fileName}>{item.file.name}</span>
                                            <button type="button" className={styles.removeFile} onClick={() => removeFile(req.id, idx)}>×</button>
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
                            value={textValues[req.id] || ''}
                            onChange={(e) => onTextValuesChange({ ...textValues, [req.id]: e.target.value })}
                        />
                    )}
                </div>
            ))}
        </>
    );
}

/** True if every mandatory requirement has a satisfying file or text value. */
export function kycRequirementsSatisfied(
    requirements: KycRequirement[],
    files: KycFileMap,
    textValues: KycTextMap,
): boolean {
    return !requirements.some(r => r.mandatory && (
        (r.type === 'file' && (!files[r.id] || files[r.id].length === 0)) ||
        (r.type === 'text' && (!textValues[r.id] || textValues[r.id].trim() === ''))
    ));
}

/**
 * Uploads every file requirement to R2 via the media-signer function, then
 * submits a single identity_verifications row covering all requirements via
 * submit_identity_verification. Shared upload/submit logic previously
 * duplicated between onboarding and verify's submit handlers.
 *
 * submit_identity_verification models one verification *attempt* (one row:
 * one document_type, one uploaded_documents array, one pii_data blob) — it
 * must be called once per submission, not once per requirement. Calling it
 * per-requirement both 404s (missing required p_tier_slug) and, once that's
 * fixed, would still fail every call after the first: the RPC rejects a new
 * submission while one is already 'pending' for the account.
 */
export async function submitKycRequirements(
    supabase: ReturnType<typeof import('@/utils/supabase/client').createClient>,
    accountId: string,
    requirements: KycRequirement[],
    files: KycFileMap,
    textValues: KycTextMap,
    tierSlug: string = 'tier_1_basic',
): Promise<void> {
    const uploadedDocs: { requirement_id: string; subtype?: string; file_keys: string[] }[] = [];
    const piiData: Record<string, string> = {};
    let primaryDocumentType: string | undefined;

    for (const req of requirements) {
        if (req.type === 'file') {
            const items = files[req.id];
            if (!items || items.length === 0) continue;

            const fileKeys: string[] = [];
            for (const item of items) {
                const fileExt = item.file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { data: signData, error: signError } = await supabase.functions.invoke('media-signer', {
                    body: {
                        action: 'upload',
                        folder: 'accounts',
                        filename: fileName,
                        contentType: item.file.type,
                        mediaType: 'image',
                    },
                });

                if (signError || !signData?.uploadUrl) {
                    throw new Error(signError?.message || 'Failed to get upload URL');
                }

                const putResponse = await fetch(signData.uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': item.file.type },
                    body: item.file,
                });

                if (!putResponse.ok) {
                    throw new Error('Failed to upload KYC document to R2');
                }

                fileKeys.push(signData.fileKey);
            }

            if (fileKeys.length > 0) {
                uploadedDocs.push({ requirement_id: req.id, subtype: req.subtype, file_keys: fileKeys });
                primaryDocumentType ??= req.subtype || req.id;
            }
        } else if (req.type === 'text') {
            const textValue = textValues[req.id];
            if (!textValue || textValue.trim() === '') continue;

            piiData[req.id] = textValue.trim();
        }
    }

    if (uploadedDocs.length === 0 && Object.keys(piiData).length === 0) return;

    await supabase.schema('api').rpc('submit_identity_verification', {
        p_account_id: accountId,
        p_tier_slug: tierSlug,
        p_document_type: (primaryDocumentType || 'national_id') as any,
        p_uploaded_docs: uploadedDocs,
        p_pii_data: piiData,
    });
}
