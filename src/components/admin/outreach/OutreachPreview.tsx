"use client";

import React from 'react';
import styles from './OutreachPreview.module.css';

interface OutreachPreviewProps {
    subject: string;
    message: string;
    audience: string;
}

const OutreachPreview: React.FC<OutreachPreviewProps> = ({ subject, message, audience }) => {
    const hasContent = subject.trim() !== '' || (message.trim() !== '' && message !== '<p></p>');

    return (
        <div className={styles.previewContainer}>
            <div className={styles.previewHeader}>
                <div className={styles.previewLabel}>Preview for {audience}</div>
                <div className={styles.previewSubject}>
                    {subject || 'No Subject'}
                </div>
            </div>

            <div className={styles.previewContent}>
                {hasContent ? (
                    <div
                        dangerouslySetInnerHTML={{ __html: message || '<p>No content yet...</p>' }}
                    />
                ) : (
                    <div className={styles.emptyPreview}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <p>Draft your announcement to see a preview here.</p>
                    </div>
                )}
            </div>

            <div className={styles.previewFooter}>
                Sent from Lynk-X Administrative Console
            </div>
        </div>
    );
};

export default OutreachPreview;
