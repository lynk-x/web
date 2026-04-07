"use client";

import React, { useState } from 'react';
import Modal from './Modal';
import adminStyles from '@/app/dashboard/admin/page.css'; // Assuming this exists or using inline
import styles from './Modal.module.css';

interface RejectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    title: string;
    placeholder?: string;
    isLoading?: boolean;
}

/**
 * Shared rejection modal for Events and Ad Campaigns.
 * Captures a reason for denial to address "Silent Rejections".
 */
const RejectionModal: React.FC<RejectionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    placeholder = "Reason for rejection...",
    isLoading = false
}) => {
    const [reason, setReason] = useState('');

    const handleConfirm = () => {
        if (!reason.trim()) return;
        onConfirm(reason);
        setReason(''); // Reset
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            footer={
                <>
                    <button 
                        onClick={onClose}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', marginRight: '12px', fontSize: '14px', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={!reason.trim() || isLoading}
                        style={{ 
                            padding: '8px 20px', 
                            borderRadius: '8px', 
                            background: 'var(--color-brand-danger, #ef4444)', 
                            color: 'white', 
                            border: 'none', 
                            fontSize: '14px', 
                            fontWeight: 600,
                            opacity: (!reason.trim() || isLoading) ? 0.5 : 1,
                            cursor: (!reason.trim() || isLoading) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLoading ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '14px', opacity: 0.8, lineHeight: '1.5' }}>
                    Please provide a clear reason for rejecting this item. This feedback will be visible to the user so they can correct the issues.
                </p>
                <textarea
                    autoFocus
                    placeholder={placeholder}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{ 
                        width: '100%', 
                        minHeight: '120px', 
                        padding: '12px', 
                        borderRadius: '12px', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        color: 'white', 
                        resize: 'vertical',
                        fontSize: '14px',
                        outline: 'none'
                    }}
                />
            </div>
        </Modal>
    );
};

export default RejectionModal;
