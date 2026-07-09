"use client";

import ContentForm from '@/components/admin/content/Form/ContentForm';
import PageHeader from '@/components/dashboard/PageHeader';
import styles from '@/app/(protected)/dashboard/admin/page.module.css';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirmModal } from '@/hooks/useConfirmModal';

export default function AdminCreateContentPage() {
    const router = useRouter();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const [isDirty, setIsDirty] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleClose = async () => {
        if (isDirty) {
            const confirmed = await confirm('You have unsaved changes. Are you sure you want to leave?', { title: 'Unsaved Changes', confirmLabel: 'Leave', cancelLabel: 'Stay' });
            if (!confirmed) return;
        }
        router.back();
    };

    return (
        <div className={styles.container}>
            {ConfirmDialog}
            <PageHeader
                title="Create New Content"
                subtitle="Draft a new page, blog post or platform announcement."
                onClose={handleClose}
                primaryAction={{
                    label: 'Create Content',
                    type: 'submit',
                    formId: 'content-form',
                    isLoading: isLoading
                }}
            />

            <ContentForm onDirtyChange={setIsDirty} showActions={false} />
        </div>
    );
}
