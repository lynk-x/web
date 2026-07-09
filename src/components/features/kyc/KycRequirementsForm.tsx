"use client";

import { useRef, useState } from 'react';
import styles from './KycRequirementsForm.module.css';

export interface KycRequirement {
    id: string;
    type: 'file' | 'text';
    label: string;
    subtype?: string;
    mandatory: boolean;
    /**
     * For file requirements backed by a physical two-sided document (a
     * national ID, alien card, etc.) — when set, renders one labeled
     * dropzone per side instead of a single freeform multi-file uploader,
     * so reviewers get an unambiguous front/back pair rather than
     * unlabeled "Page 1"/"Page 2" images.
     */
    sides?: string[];
    /** Short one-line tip shown under the label — e.g. what makes a photo acceptable. */
    hint?: string;
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
    const sideInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // A just-selected image is staged here before being committed to `files`,
    // so the user can confirm it's readable (or retake) instead of only
    // discovering a bad photo after a reviewer rejects it later. PDFs skip
    // this step — there's nothing useful to zoom into.
    const [pendingReview, setPendingReview] = useState<{
        reqId: string;
        sideIndex?: number;
        file: File;
        preview: string;
    } | null>(null);

    const stageOrCommitFile = (reqId: string, file: File, sideIndex?: number) => {
        if (!file.type.startsWith('image/')) {
            if (sideIndex !== undefined) setSideFile(reqId, sideIndex, file);
            else commitFiles(reqId, [file]);
            return;
        }
        setPendingReview({ reqId, sideIndex, file, preview: URL.createObjectURL(file) });
    };

    const confirmPendingReview = () => {
        if (!pendingReview) return;
        const { reqId, sideIndex, file } = pendingReview;
        if (sideIndex !== undefined) setSideFile(reqId, sideIndex, file);
        else commitFiles(reqId, [file]);
        setPendingReview(null);
    };

    const retakePendingReview = () => {
        if (!pendingReview) return;
        URL.revokeObjectURL(pendingReview.preview);
        const { reqId, sideIndex } = pendingReview;
        setPendingReview(null);
        if (sideIndex !== undefined) sideInputRefs.current[`${reqId}_${sideIndex}`]?.click();
        else fileInputRefs.current[reqId]?.click();
    };

    const commitFiles = (reqId: string, newFiles: File[]) => {
        onFilesChange({
            ...files,
            [reqId]: [
                ...(files[reqId] || []),
                ...newFiles.map(file => ({ file, preview: URL.createObjectURL(file) })),
            ],
        });
    };

    const handleFileChange = (reqId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files;
        if (!selected || selected.length === 0) return;
        // Single-image selection goes through the readability-confirmation
        // step; multi-select (or non-image files) commits directly.
        if (selected.length === 1 && selected[0].type.startsWith('image/')) {
            stageOrCommitFile(reqId, selected[0]);
        } else {
            commitFiles(reqId, Array.from(selected));
        }
        e.target.value = '';
    };

    const removeFile = (reqId: string, index: number) => {
        const nextFiles = [...(files[reqId] || [])];
        URL.revokeObjectURL(nextFiles[index].preview);
        nextFiles.splice(index, 1);
        onFilesChange({ ...files, [reqId]: nextFiles });
    };

    /** Sets (or replaces) the file at a fixed side index — e.g. 0 = Front, 1 = Back. */
    const setSideFile = (reqId: string, sideIndex: number, file: File) => {
        const nextFiles = [...(files[reqId] || [])];
        if (nextFiles[sideIndex]) URL.revokeObjectURL(nextFiles[sideIndex].preview);
        nextFiles[sideIndex] = { file, preview: URL.createObjectURL(file) };
        onFilesChange({ ...files, [reqId]: nextFiles });
    };

    const removeSideFile = (reqId: string, sideIndex: number) => {
        const nextFiles = [...(files[reqId] || [])];
        if (nextFiles[sideIndex]) {
            URL.revokeObjectURL(nextFiles[sideIndex].preview);
            delete nextFiles[sideIndex];
        }
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
                    {req.hint && <p className={styles.hint}>{req.hint}</p>}

                    {req.type === 'file' && req.sides ? (
                        <div className={styles.sidesGrid}>
                            {req.sides.map((sideLabel, sideIndex) => {
                                const item = (files[req.id] || [])[sideIndex];
                                return (
                                    <div key={sideLabel} className={styles.sideSlot}>
                                        <span className={styles.sideLabel}>{sideLabel}</span>
                                        {item ? (
                                            <div className={styles.fileItem}>
                                                <div className={styles.filePreview}>
                                                    {item.file.type.startsWith('image/') ? (
                                                        <img src={item.preview} alt={`${sideLabel} preview`} />
                                                    ) : (
                                                        <div className={styles.pdfIcon}>PDF</div>
                                                    )}
                                                </div>
                                                <span className={styles.fileName}>{item.file.name}</span>
                                                <button type="button" className={styles.removeFile} onClick={() => removeSideFile(req.id, sideIndex)}>×</button>
                                            </div>
                                        ) : (
                                            <div
                                                className={styles.kycUploadArea}
                                                onClick={() => sideInputRefs.current[`${req.id}_${sideIndex}`]?.click()}
                                            >
                                                <div style={{ textAlign: 'center' }}>
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: '6px', opacity: 0.5 }}>
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                                                    </svg>
                                                    <p style={{ fontSize: '13px', opacity: 0.8 }}>Upload {sideLabel.toLowerCase()}</p>
                                                </div>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            ref={el => { sideInputRefs.current[`${req.id}_${sideIndex}`] = el; }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) stageOrCommitFile(req.id, file, sideIndex);
                                                e.target.value = '';
                                            }}
                                            style={{ display: 'none' }}
                                            accept="image/*,application/pdf"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : req.type === 'file' ? (
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

            {pendingReview && (
                <div className={styles.reviewOverlay} onClick={retakePendingReview}>
                    <div className={styles.reviewModal} onClick={(e) => e.stopPropagation()}>
                        <p className={styles.reviewTitle}>Is this photo clear and readable?</p>
                        <div className={styles.reviewImageWrap}>
                            <img src={pendingReview.preview} alt="Review upload" />
                        </div>
                        <p className={styles.reviewHint}>Check that all corners and text are visible, with no glare or blur.</p>
                        <div className={styles.reviewActions}>
                            <button type="button" className={styles.reviewRetakeBtn} onClick={retakePendingReview}>
                                Retake
                            </button>
                            <button type="button" className={styles.reviewConfirmBtn} onClick={confirmPendingReview}>
                                Use This Photo
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
        (r.type === 'file' && r.sides
            ? r.sides.some((_, i) => !(files[r.id] || [])[i])
            : r.type === 'file' && (!files[r.id] || files[r.id].length === 0)) ||
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
// Mirrors identity.kyc_document_type in supabase/schema/00_base/04_types.sql.
const VALID_DOCUMENT_TYPES = new Set(['national_id', 'passport', 'alien_card', 'incorporation_cert', 'utility_bill']);


function resolveDocumentType(raw: string | undefined): string {
    if (!raw) return 'national_id';
    for (const candidate of raw.split('|')) {
        if (VALID_DOCUMENT_TYPES.has(candidate)) return candidate;
    }
    return 'national_id';
}

export async function submitKycRequirements(
    supabase: ReturnType<typeof import('@/utils/supabase/client').createClient>,
    accountId: string,
    requirements: KycRequirement[],
    files: KycFileMap,
    textValues: KycTextMap,
    tierSlug: string = 'tier_1_basic',
    extraPiiData: Record<string, string | boolean> = {},
): Promise<void> {
    const uploadedDocs: string[] = [];
    const piiData: Record<string, string | boolean> = { ...extraPiiData };
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
                uploadedDocs.push(...fileKeys);
                primaryDocumentType ??= resolveDocumentType(req.subtype || req.id);
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
