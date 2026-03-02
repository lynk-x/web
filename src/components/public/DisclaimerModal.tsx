"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './DisclaimerModal.module.css';

export interface Disclaimer {
    id: string;
    title: string;
    content: string;
}

interface DisclaimerModalProps {
    isOpen: boolean;
    disclaimers: Disclaimer[];
    onAccept: () => void;
    onClose: () => void;
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, disclaimers, onAccept, onClose }) => {
    const [hasAgreed, setHasAgreed] = useState(false);

    // Reset agreement state when opening
    useEffect(() => {
        if (isOpen) setHasAgreed(false);
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className={styles.overlay} onClick={onClose}>
                <motion.div
                    className={styles.modal}
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                >
                    <div className={styles.header}>
                        <h2 className={styles.title}>Important Information</h2>
                        <p className={styles.subtitle}>Please review the legal disclaimers before proceeding.</p>
                        <button className={styles.closeBtn} onClick={onClose}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    <div className={styles.body}>
                        {disclaimers.map((d, idx) => (
                            <div key={d.id} className={styles.disclaimerItem}>
                                <h3 className={styles.disclaimerTitle}>{idx + 1}. {d.title}</h3>
                                <div className={styles.disclaimerContent}>{d.content}</div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.footer}>
                        <label className={styles.checkboxContainer}>
                            <input
                                type="checkbox"
                                checked={hasAgreed}
                                onChange={(e) => setHasAgreed(e.target.checked)}
                                className={styles.checkbox}
                            />
                            <span className={styles.checkmark}></span>
                            <span className={styles.checkboxLabel}>I have read and agree to all the terms mentioned.</span>
                        </label>

                        <div className={styles.actions}>
                            <button className={styles.cancelBtn} onClick={onClose}>
                                Maybe Later
                            </button>
                            <button
                                className={styles.confirmBtn}
                                onClick={onAccept}
                                disabled={!hasAgreed}
                            >
                                Accept & Proceed
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DisclaimerModal;
