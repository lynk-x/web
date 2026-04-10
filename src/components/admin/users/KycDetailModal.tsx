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

const KycDetailModal: React.FC<KycDetailModalProps> = ({
    isOpen,
    onClose,
    verification,
    onApprove,
    onReject,
}) => {
    const supabase = createClient();
    const [signedUrls, setSignedUrls] = useState<string[]>([]);
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        const fetchImages = async () => {
            if (!verification?.uploaded_documents?.length) return;

            const { data, error } = await supabase.storage
                .from('kyc-documents')
                .createSignedUrls(verification.uploaded_documents, 3600);

            if (data) setSignedUrls(data.filter(d => d.signedUrl).map(d => d.signedUrl!));
        };

        if (isOpen && verification) {
            fetchImages();
            setIsRejecting(false);
            setRejectionReason('');
        }
    }, [isOpen, verification, supabase]);

    if (!verification) return null;

    const piiFields = Object.entries(verification.pii_data || {});

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
                            {(verification.status === 'pending' || verification.status === 'submitted') && (
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
                {/* Status & Overview */}
                <div className={styles.section}>
                    <div className={styles.header}>
                        <div className={styles.badgeRow}>
                            <Badge label={formatString(verification.kyc_tier)} variant="primary" />
                            <Badge label={formatString(verification.status)} variant={verification.status === 'approved' ? 'success' : 'warning'} showDot />
                        </div>
                        <span className={styles.timestamp}>Submitted on {formatDate(verification.created_at)}</span>
                    </div>
                </div>

                {/* Documents Grid */}
                <div className={styles.section}>
                    <h3>Uploaded {formatString(verification.document_type)}</h3>
                    <div className={styles.imageGrid}>
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
                    </div>
                </div>

                {/* PII Metadata */}
                <div className={styles.section}>
                    <h3>Verified Information</h3>
                    <div className={styles.piiGrid}>
                        {piiFields.map(([key, value]) => (
                            <div key={key} className={styles.piiItem}>
                                <label>{formatString(key)}</label>
                                <span>{String(value)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rejection UI */}
                {isRejecting && (
                    <div className={styles.rejectionBox}>
                        <h3>Reason for Rejection</h3>
                        <p>Provide detailed feedback to the user on why their verification was rejected.</p>
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
