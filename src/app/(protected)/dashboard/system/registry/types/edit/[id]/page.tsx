"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { sanitizeInput } from '@/utils/sanitization';
import SubPageHeader from '@/components/shared/SubPageHeader';
import styles from '@/app/(protected)/dashboard/admin/settings/page.module.css';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';

export default function EditTagTypePage() {
    const router = useRouter();
    const params = useParams();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient().schema('api' as any), []);

    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isDirty, setIsDirty] = useState(false);

    const [formData, setFormData] = useState({
        description: '',
        is_active: true
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data, error } = await supabase.rpc('get_admin_registry_data', { p_tab: 'tag_types' });

                if (error) throw error;
                const type = (data || []).find((t: any) => t.id === params.id);
                if (!type) throw new Error('Tag type not found');

                setFormData({
                    description: type.description || '',
                    is_active: type.is_active
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
            const { error } = await supabase.rpc('admin_upsert_registry_item', {
                p_tab: 'tag_types',
                p_data: {
                    id: params.id,
                    ...formData
                }
            });

            if (error) throw error;

            showToast('Tag type updated successfully', 'success');
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

    if (isFetching) return <div style={{ padding: '40px', opacity: 0.5 }}>Loading type details...</div>;

    return (
        <div className={styles.container}>
            <SubPageHeader
                title={`Edit Type: ${params.id}`}
                subtitle="Modify description or status of this category."
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
                        <label className={adminStyles.label}>Description</label>
                        <textarea
                            className={adminStyles.input}
                            rows={3}
                            value={formData.description}
                            onChange={(e) => updateField('description', e.target.value)}
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <div className={adminStyles.formGroup}>
                        <label className={adminStyles.label}>Status</label>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => updateField('is_active', e.target.checked)}
                                />
                                <span style={{ fontSize: '14px' }}>Active / Enabled</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
