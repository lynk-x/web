"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import ContentForm from '@/components/admin/content/Form/ContentForm';
import BackButton from '@/components/shared/BackButton';
import styles from '@/app/dashboard/admin/page.module.css';

// Mock data fetch
const mockContent = [
    { id: '1', title: 'Terms of Service', slug: '/terms', type: 'page', status: 'published', content: '<h2>Terms of Service</h2><p>Welcome to Lynk-X...</p>' },
    { id: '4', title: 'Welcome to Lynk-X 2.0', slug: '/blog/welcome-v2', type: 'post', status: 'published', content: '<h2>Big News!</h2><p>We are excited to announce...</p>' },
];

export default function AdminEditContentPage() {
    const params = useParams();
    const id = params.id as string;
    const [isDirty, setIsDirty] = useState(false);

    const item = mockContent.find(c => c.id === id) || {
        title: 'Draft Content',
        slug: '/draft',
        type: 'page',
        status: 'draft',
        content: '<p>Standard mock content for editing...</p>'
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <BackButton label="Back to Content" isDirty={isDirty} />
                    <h1 className={styles.title}>Edit Content</h1>
                    <p className={styles.subtitle}>Modifying: {item.title}</p>
                </div>
            </header>

            <ContentForm initialData={item as any} isEditing={true} onDirtyChange={setIsDirty} />
        </div>
    );
}
