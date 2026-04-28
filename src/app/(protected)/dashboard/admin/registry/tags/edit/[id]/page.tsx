"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { sanitizeInput } from '@/utils/sanitization';
import SubPageHeader from '@/components/shared/SubPageHeader';
import styles from '@/app/(protected)/dashboard/admin/settings/page.module.css';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';

export default function EditTagPage() {
    const router = useRouter();
    const params = useParams();
    const { showToast } = useToast();
    const supabase = createClient();

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
                // Fetch Types
                const { data: types } = await supabase.from('tag_types').select('id').eq('is_active', true);
                if (types) setTagTypes(types);

                // Fetch Tag
                const { data: tag, error } = await supabase
                    .from('tags')
                    .select('*')
                    .eq('id', params.id)
                    .single();

                if (error) throw error;
                if (tag) {
                    setFormData({
                        name: tag.name,
                        slug: tag.slug,
                        type_id: tag.type_id || '',
                        is_official: tag.is_official,
                        is_active: tag.is_active
                    });
                }
            } catch (error: any) {
                showToast(error.message, 'error');
            } finally {
                setIsFetching(false);
            }
        };
        fetchData();
    }, [supabase, params.id, showToast]);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('tags')
                .update({
                    ...formData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', params.id);

            if (error) throw error;

            showToast('Tag updated successfully', 'success');
            setIsDirty(false);
            router.push('/dashboard/admin/registry');
        } catch (error: any) {
            showToast(error.message, 'error');
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
                subtitle="Modify label, classification, or status of this tag."
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
