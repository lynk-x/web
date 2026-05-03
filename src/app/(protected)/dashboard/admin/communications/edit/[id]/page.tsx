"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ContentForm from '@/components/admin/content/Form/ContentForm';
import BackButton from '@/components/shared/BackButton';
import styles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { ContentItem } from '@/types/admin';

export default function AdminEditContentPage() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const id = params.id as string;
    const [item, setItem] = useState<ContentItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        async function fetchItem() {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('cms_pages')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (data) {
                    setItem({
                        id: data.id,
                        title: data.title,
                        slug: data.slug,
                        type: data.type,
                        status: data.status,
                        content: data.content,
                        author: 'System',
                        lastUpdated: new Date(data.updated_at).toLocaleDateString()
                    });
                }
            } catch (err: unknown) {
                showToast(getErrorMessage(err), 'error');
                router.push('/dashboard/admin/communications?tab=content');
            } finally {
                setIsLoading(false);
            }
        }
        if (id) fetchItem();
    }, [id, supabase, router, showToast]);

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div style={{ padding: '80px', textAlign: 'center', opacity: 0.5 }}>Loading content...</div>
            </div>
        );
    }

    if (!item) return null;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <BackButton label="Back to Content" isDirty={isDirty} />
                    <h1 className={styles.title}>Edit Content</h1>
                    <p className={styles.subtitle}>Modifying: {item.title}</p>
                </div>
            </header>

            <ContentForm initialData={item} isEditing={true} onDirtyChange={setIsDirty} />
        </div>
    );
}
