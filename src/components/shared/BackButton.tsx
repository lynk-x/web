"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/(protected)/dashboard/admin/page.module.css';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface BackButtonProps {
    label?: string;
    href?: string;
    className?: string;
    isDirty?: boolean;
}

export default function BackButton({
    label = 'Back to Overview',
    href,
    className = '',
    isDirty = false
}: BackButtonProps) {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);

    const navigate = () => {
        if (href) {
            router.push(href);
        } else {
            router.back();
        }
    };

    const handleBack = () => {
        if (isDirty) {
            setShowModal(true);
        } else {
            navigate();
        }
    };

    return (
        <>
            <button
                onClick={handleBack}
                className={`${styles.btnBack} ${className}`}
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                {label}
            </button>
            <ConfirmationModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={() => { setShowModal(false); navigate(); }}
                title="Unsaved Changes"
                message="You have unsaved changes. Are you sure you want to leave?"
                confirmLabel="Leave"
                cancelLabel="Stay"
                variant="danger"
            />
        </>
    );
}
