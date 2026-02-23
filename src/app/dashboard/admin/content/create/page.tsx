"use client";

import ContentForm from '@/components/admin/content/Form/ContentForm';
import BackButton from '@/components/shared/BackButton';
import styles from '@/app/dashboard/admin/page.module.css';
import { useState } from 'react';

export default function AdminCreateContentPage() {
    const [isDirty, setIsDirty] = useState(false);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <BackButton label="Back to Content" isDirty={isDirty} />
                    <h1 className={styles.title}>Create New Content</h1>
                    <p className={styles.subtitle}>Draft a new page, blog post, or platform announcement.</p>
                </div>
            </header>

            <ContentForm onDirtyChange={setIsDirty} />
        </div>
    );
}
