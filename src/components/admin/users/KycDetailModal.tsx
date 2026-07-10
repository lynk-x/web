"use client";

import React, { useState, useEffect } from 'react';
import styles from './KycDetailModal.module.css';
import Modal from '../../shared/Modal';
import Badge from '../../shared/Badge';
import { formatString, formatDate } from '@/utils/format';
import type { KycVerification } from '@/types/admin';
import { createClient } from '@/utils/supabase/client';

interface KycDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    verification: KycVerification | null;
    onApprove: (v: KycVerification) => void;
    onReject: (v: KycVerification, reason: string) => void;
}

type Step = 'info' | 'documents' | 'notes';

const STEPS: { key: Step; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'documents', label: 'Documents' },
    { key: 'notes', label: 'Notes' },
];

const REJECTION_SUGGESTIONS = [
    'ID photo is blurry or out of focus',
    'Document is expired',
    'Name on document does not match account name',
    'Photo is cropped — all four corners must be visible',
    'Document type does not match what was requested',
    'Selfie/photo does not clearly show your face',
    'Submitted information does not match the document',
    'Document appears to be edited or tampered with',
];

const KycDetailModal: React.FC<KycDetailModalProps> = ({
    isOpen,
    onClose,
    verification,
    onApprove,
    onReject,
}) => {
    const supabase = createClient();
    const [step, setStep] = useState<Step>('info');
    const [signedUrls, setSignedUrls] = useState<string[]>([]);
    const [decryptedPii, setDecryptedPii] = useState<Record<string, unknown>>({});
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [adminNotes, setAdminNotes] = useState('');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [notesSaved, setNotesSaved] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!verification) return;
            setIsLoadingDetail(true);
            try {
                const { data: detail, error } = await supabase
                    .schema('api')
                    .rpc('get_kyc_verification_detail', { p_verification_id: verification.id });

                if (error) throw error;

                setDecryptedPii(detail?.pii_data || {});
                setAdminNotes(detail?.admin_notes || '');

                const documents: string[] = detail?.uploaded_documents || [];
                if (documents.length > 0) {
                    const { data: signData } = await supabase.functions.invoke('media-signer', {
                        body: { action: 'sign_read_batch', fileKeys: documents }
                    });

                    if (signData?.signedUrls) {
                        const urls = documents.map(key => signData.signedUrls[key]).filter(Boolean);
                        setSignedUrls(urls);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch KYC verification detail:', err);
            } finally {
                setIsLoadingDetail(false);
            }
        };

        if (isOpen && verification) {
            fetchDetail();
            setStep('info');
            setIsRejecting(false);
            setRejectionReason('');
            setSignedUrls([]);
            setDecryptedPii({});
            setAdminNotes('');
            setNotesSaved(false);
        }
    }, [isOpen, verification, supabase]);

    if (!verification) return null;

    const piiFields = Object.entries(decryptedPii || {});
    const stepIndex = STEPS.findIndex(s => s.key === step);

    const handleSaveNotes = async () => {
        setIsSavingNotes(true);
        setNotesSaved(false);
        try {
            const { error } = await supabase
                .schema('api')
                .rpc('update_kyc_admin_notes', { p_verification_id: verification.id, p_notes: adminNotes });

            if (error) throw error;
            setNotesSaved(true);
        } catch (err) {
            console.error('Failed to save admin notes:', err);
        } finally {
            setIsSavingNotes(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Review Identity: ${verification.account_name || 'Organization'}`}
            size="large"
            footer={
                <div className={styles.footer}>
                    {isRejecting ? (
                        <>
                            <button className={styles.btnSecondary} onClick={() => setIsRejecting(false)}>Cancel</button>
                            <button
                                className={styles.btnDanger}
                                onClick={() => onReject(verification, rejectionReason)}
                                disabled={!rejectionReason.trim()}
                            >
                                Confirm Rejection
                            </button>
                        </>
                    ) : (
                        <>
                            <button className={styles.btnSecondary} onClick={onClose}>Close</button>
                            {(verification.status === 'pending') && (
                                <div className={styles.actions}>
                                    <button className={styles.btnDangerOutline} onClick={() => setIsRejecting(true)}>Reject</button>
                                    <button className={styles.btnSuccess} onClick={() => onApprove(verification)}>Approve Verification</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            }
        >
            <div className={styles.content}>
                <div className={styles.stepIndicator}>
                    {STEPS.map((s, i) => (
                        <React.Fragment key={s.key}>
                            {i > 0 && <div className={`${styles.stepLine} ${i <= stepIndex ? styles.stepLineActive : ''}`} />}
                            <button
                                type="button"
                                className={styles.stepButton}
                                onClick={() => setStep(s.key)}
                            >
                                <div className={`${styles.stepDot} ${i <= stepIndex ? styles.stepDotActive : ''}`}>
                                    <span>{i + 1}</span>
                                </div>
                                <span className={styles.stepLabel}>{s.label}</span>
                            </button>
                        </React.Fragment>
                    ))}
                </div>

                {step === 'info' && (
                    <>
                        <div className={styles.section}>
                            <div className={styles.header}>
                                <div className={styles.badgeRow}>
                                    <Badge label={formatString(verification.kyc_tier)} variant="primary" />
                                    <Badge label={formatString(verification.status)} variant={verification.status === 'approved' ? 'success' : 'warning'} showDot />
                                </div>
                                <span className={styles.timestamp}>Submitted on {formatDate(verification.created_at)}</span>
                            </div>
                        </div>

                        <div className={styles.section}>
                            <h3>Verified Information</h3>
                            <div className={styles.piiGrid}>
                                {isLoadingDetail ? (
                                    <span>Decrypting...</span>
                                ) : decryptedPii._decryption_error ? (
                                    <span className={styles.decryptionError}>
                                        Could not decrypt this submission&apos;s information. It may have been encrypted
                                        under a different key, or the payload is corrupted. Contact engineering with this
                                        verification&apos;s reference if the issue persists.
                                    </span>
                                ) : piiFields.length === 0 ? (
                                    <span>No additional information submitted.</span>
                                ) : (
                                    piiFields.map(([key, value]) => (
                                        <div key={key} className={styles.piiItem}>
                                            <label>{formatString(key)}</label>
                                            <span>{String(value)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}

                {step === 'documents' && (
                    <div className={styles.section}>
                        <h3>Uploaded {formatString(verification.document_type)}</h3>
                        <div className={styles.imageGrid}>
                            {isLoadingDetail ? (
                                <div className={styles.emptyDocuments}>
                                    <span>Loading documents...</span>
                                </div>
                            ) : (
                                <>
                                    {signedUrls.map((url, idx) => (
                                        <div key={idx} className={styles.imageWrapper}>
                                            <img src={url} alt={`KYC Document ${idx + 1}`} tabIndex={0} />
                                            <span className={styles.imageLabel}>Page {idx + 1}</span>
                                        </div>
                                    ))}
                                    {signedUrls.length === 0 && (
                                        <div className={styles.emptyDocuments}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                            <span>No document images available</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {step === 'notes' && (
                    <div className={styles.section}>
                        <h3>Admin Notes</h3>
                        <p className={styles.notesHint}>
                            Internal notes for reviewers — never shown to the applicant.
                        </p>
                        <textarea
                            value={adminNotes}
                            onChange={(e) => { setAdminNotes(e.target.value); setNotesSaved(false); }}
                            placeholder="e.g. Called applicant to confirm ID, looks legitimate..."
                            className={styles.textarea}
                            disabled={isLoadingDetail}
                        />
                        <div className={styles.notesActions}>
                            {notesSaved && <span className={styles.notesSavedLabel}>Saved</span>}
                            <button
                                type="button"
                                className={styles.btnSecondary}
                                onClick={handleSaveNotes}
                                disabled={isSavingNotes || isLoadingDetail}
                            >
                                {isSavingNotes ? 'Saving...' : 'Save Notes'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Rejection UI */}
                {isRejecting && (
                    <div className={styles.rejectionBox}>
                        <h3>Reason for Rejection</h3>
                        <p>Provide detailed feedback to the user on why their verification was rejected.</p>
                        <div className={styles.suggestionChips}>
                            {REJECTION_SUGGESTIONS.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    className={styles.suggestionChip}
                                    onClick={() => setRejectionReason((prev) => {
                                        const trimmed = prev.trim();
                                        if (!trimmed) return suggestion;
                                        if (trimmed.includes(suggestion)) return trimmed;
                                        return `${trimmed} ${suggestion}`;
                                    })}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. ID photo is blurry, Please upload a high-resolution color scan of your passport..."
                            className={styles.textarea}
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default KycDetailModal;
