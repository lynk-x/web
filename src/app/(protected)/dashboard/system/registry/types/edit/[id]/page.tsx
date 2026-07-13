"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { sanitizeInput } from '@/utils/sanitization';
import PageHeader from '@/components/dashboard/PageHeader';
import styles from '@/app/(protected)/dashboard/admin/settings/page.module.css';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import FormRow from '@/components/shared/FormRow';
import { useConfirmModal } from '@/hooks/useConfirmModal';

export default function EditTagTypePage() {
    const router = useRouter();
    const params = useParams();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient().schema('api' as any), []);
    const { confirm, ConfirmDialog } = useConfirmModal();

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
                const { data, error } = await supabase.schema('api').rpc('get_admin_registry_data', { p_tab: 'tag_types' });

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
            const { error } = await supabase.schema('api').rpc('admin_upsert_registry_item', {
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

    const handleClose = async () => {
        if (isDirty) {
            const confirmed = await confirm('You have unsaved changes. Are you sure you want to leave?', { title: 'Unsaved Changes', confirmLabel: 'Leave', cancelLabel: 'Stay' });
            if (!confirmed) return;
        }
        router.push('/dashboard/system/registry');
    };

    return (
        <div className={styles.container}>
            {ConfirmDialog}
            <PageHeader
                title={`Edit Type: ${params.id}`}
                subtitle="Modify description or status of this category."
                primaryAction={{
                    label: "Save Changes",
                    onClick: handleSave,
                    isLoading: isLoading
                }}
                onClose={handleClose}
            />

            <div className={adminStyles.formCard}>
                <div className={adminStyles.formGrid}>
                    <FormRow label="Description">
                        <textarea
                            className={adminStyles.textarea}
                            rows={3}
                            value={formData.description}
                            onChange={(e) => updateField('description', e.target.value)}
                        />
                    </FormRow>

                    <FormRow label="Status">
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
                    </FormRow>
                </div>
            </div>
        </div>
    );
}
