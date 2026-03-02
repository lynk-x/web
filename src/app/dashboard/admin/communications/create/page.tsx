"use client";

import ContentForm from '@/components/admin/content/Form/ContentForm';
import SubPageHeader from '@/components/shared/SubPageHeader';
import styles from '@/app/dashboard/admin/page.module.css';
import { useState } from 'react';

export default function AdminCreateContentPage() {
    const [isDirty, setIsDirty] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    return (
        <div className={styles.container}>
            <SubPageHeader
                title="Create New Content"
                subtitle="Draft a new page, blog post, or platform announcement."
                isDirty={isDirty}
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
