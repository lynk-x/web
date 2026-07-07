"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { generateTagEmbedding } from '@/utils/embedding';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

import { sanitizeInput } from '@/utils/sanitization';
import SubPageHeader from '@/components/shared/SubPageHeader';
import styles from '@/app/(protected)/dashboard/admin/settings/page.module.css';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';

export default function EditTagPage() {
    const router = useRouter();
    const params = useParams();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient().schema('api' as any), []);
    const { enabled: isEmbedEnabled } = useFeatureFlag('enable_client_embeddings');

    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const [tagTypes, setTagTypes] = useState<{ id: string }[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        type_id: '',
        is_official: true,
        is_active: true
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Types and Tag using RPCs
                const [typesRes, tagsRes] = await Promise.all([
                    supabase.schema('api').rpc('get_admin_registry_data', { p_tab: 'tag_types' }),
                    supabase.schema('api').rpc('get_admin_registry_data', { p_tab: 'tags' })
                ]);

                if (typesRes.error) throw typesRes.error;
                if (tagsRes.error) throw tagsRes.error;

                const activeTypes = (typesRes.data || []).filter((t: any) => t.is_active);
                setTagTypes(activeTypes);

                const tag = (tagsRes.data || []).find((t: any) => t.id === params.id);
                if (!tag) throw new Error('Tag not found');

                setFormData({
                    name: tag.name,
                    slug: tag.slug,
                    type_id: tag.type_id || '',
                    is_official: tag.is_official,
                    is_active: tag.is_active
                });
            } catch (error: unknown) {
                showToast(getErrorMessage(error), 'error');
            } finally {
                setIsFetching(false);
            }
        };
        fetchData();
    }, [supabase, params.id, showToast]);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('admin_upsert_registry_item', {
                p_tab: 'tags',
                p_data: formData
            });

            if (error) throw error;

            const tagId = (data as any)?.id;
            if (tagId && isEmbedEnabled === true) {
                try {
                    const vector = await generateTagEmbedding(formData.name, formData.type_id);
                    if (vector && vector.length > 0) {
                        // identity.tags is not PostgREST-exposed; this previously
                        // called .schema('identity') directly, which always
                        // failed silently (caught into a console.error).
                        const { error: embedError } = await supabase
                            .rpc('admin_save_tag_embedding', { p_tag_id: tagId, p_embedding: vector });
                        if (embedError) {
                            console.error('[Embedding] Failed to save tag embedding:', embedError);
                        }
                    }
                } catch (embedErr) {
                    console.error('[Embedding] Failed to generate/save tag embedding:', embedErr);
                }
            }

            showToast('Tag updated successfully', 'success');
            setIsDirty(false);
            router.push('/dashboard/system/registry');
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const updateField = (field: string, value: any) => {
        const sanitizedValue = typeof value === 'string' ? sanitizeInput(value) : value;
        setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
        setIsDirty(true);
    };

    if (isFetching) return <div style={{ padding: '40px', opacity: 0.5 }}>Loading tag details...</div>;

    return (
        <div className={styles.container}>
            <SubPageHeader
                title={`Edit Tag: ${formData.name}`}
                subtitle="Modify label, classification or status of this tag."
                primaryAction={{
                    label: "Save Changes",
                    onClick: handleSave,
                    isLoading: isLoading
                }}
                isDirty={isDirty}
            />

            <div className={adminStyles.formCard}>
                <div className={adminStyles.formGrid}>
                    <div className={adminStyles.formGroup}>
                        <label className={adminStyles.label}>Display Name</label>
                        <input
                            type="text"
                            className={adminStyles.input}
                            value={formData.name}
                            onChange={(e) => updateField('name', e.target.value)}
                        />
                    </div>

                    <div className={adminStyles.formGroup}>
                        <label className={adminStyles.label}>URL Slug (Immutable)</label>
                        <input
                            type="text"
                            className={adminStyles.input}
                            value={formData.slug}
                            disabled
                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                        />
                    </div>

                    <div className={adminStyles.formGroup}>
                        <label className={adminStyles.label}>Tag Type</label>
                        <select
                            className={adminStyles.select}
                            value={formData.type_id}
                            onChange={(e) => updateField('type_id', e.target.value)}
                        >
                            <option value="">Select a type...</option>
                            {tagTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.id}</option>
                            ))}
                        </select>
                    </div>

                    <div className={adminStyles.formGroup}>
                        <label className={adminStyles.label}>Settings</label>
                        <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.is_official}
                                    onChange={(e) => updateField('is_official', e.target.checked)}
                                />
                                <span style={{ fontSize: '14px' }}>Official Tag</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => updateField('is_active', e.target.checked)}
                                />
                                <span style={{ fontSize: '14px' }}>Enabled</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
