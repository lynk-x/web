"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ContentForm from '@/components/admin/content/Form/ContentForm';
import PageHeader from '@/components/dashboard/PageHeader';
import styles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { ContentItem } from '@/types/admin';
import { useConfirmModal } from '@/hooks/useConfirmModal';

export default function AdminEditContentPage() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
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
                    .schema('api')
                    .from('v1_cms_pages')
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
                router.push('/dashboard/system/outreach?tab=content');
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
                title="Edit Content"
                subtitle={`Modifying: ${item.title}`}
                onClose={handleClose}
            />

            <ContentForm initialData={item} isEditing={true} onDirtyChange={setIsDirty} />
        </div>
    );
}
