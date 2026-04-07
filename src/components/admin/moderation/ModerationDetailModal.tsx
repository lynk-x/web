"use client";

import React from 'react';
import Modal from '@/components/shared/Modal';
import Badge from '@/components/shared/Badge';
import { formatDate } from '@/utils/format';

interface ModerationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    entry: any; // ModerationEntry
}

/**
 * Shows the snapshot content of an item at the time of flagging/review.
 * This prevents users from changing content after a rejection to bypass rules.
 */
const ModerationDetailModal: React.FC<ModerationDetailModalProps> = ({
    isOpen,
    onClose,
    entry
}) => {
    if (!entry) return null;

    const metadata = entry.metadata || {};

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Moderation Detail: ${entry.item_type.toUpperCase()}`}
            footer={
                <button 
                    onClick={onClose}
                    style={{ padding: '8px 24px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                >
                    Close
                </button>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.7, fontSize: '13px' }}>
                    <span>ID: {entry.item_id}</span>
                    <span>Flagged: {formatDate(entry.created_at)}</span>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <label style={{ display: 'block', fontSize: '12px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase' }}>
                        Snapshotted Content
                    </label>
                    
                    {metadata.title && (
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 600 }}>{metadata.title}</h3>
                    )}

                    {metadata.description && (
                        <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: '1.6', opacity: 0.8 }}>
                            {metadata.description}
                        </p>
                    )}

                    {metadata.media_urls && metadata.media_urls.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                            {metadata.media_urls.map((url: string, i: number) => (
                                <div key={i} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <img src={url} alt={`Snapshot ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            ))}
                        </div>
                    )}

                    {!metadata.title && !metadata.description && (
                        <div style={{ opacity: 0.4, fontStyle: 'italic' }}>No content snapshot available.</div>
                    )}
                </div>

                {entry.reason && (
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#ef4444', marginBottom: '4px', fontWeight: 600 }}>
                            REVIEWER FLAG REASON
                        </label>
                        <p style={{ margin: 0, fontSize: '14px' }}>{entry.reason}</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ModerationDetailModal;
