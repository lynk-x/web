"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/dashboard/PageHeader';
import styles from '@/app/(protected)/dashboard/admin/settings/page.module.css';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import FormRow from '@/components/shared/FormRow';
import { DatePicker } from '@/components/ui/DatePicker';
import { useConfirmModal } from '@/hooks/useConfirmModal';

export default function EditDisclaimerPage() {
    const router = useRouter();
    const params = useParams();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient().schema('api' as any), []);
    const { confirm, ConfirmDialog } = useConfirmModal();

    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const [tags, setTags] = useState<{ id: string, name: string }[]>([]);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        tag_id: '',
        effective_date: '',
        is_active: true
    });

    useEffect(() => {
        const load = async () => {
            try {
                const [tagsRes, ruleRes] = await Promise.all([
                    supabase.schema('api').rpc('get_admin_registry_data', { p_tab: 'tags' }),
                    supabase.schema('api').rpc('get_admin_registry_data', { p_tab: 'disclaimers' })
                ]);

                if (tagsRes.error) throw tagsRes.error;
                if (ruleRes.error) throw ruleRes.error;

                if (tagsRes.data) setTags(tagsRes.data);
                
                const rule = (ruleRes.data || []).find((r: any) => r.id === params.id);
                if (!rule) throw new Error('Compliance rule not found');

                setFormData({
                    title: rule.title,
                    content: rule.content,
                    tag_id: rule.tag_id,
                    effective_date: rule.effective_date ? rule.effective_date.split('T')[0] : '',
                    is_active: rule.is_active
                });
            } catch (error: unknown) {
                showToast(getErrorMessage(error), 'error');
            } finally {
                setIsFetching(false);
            }
        };
        load();
    }, [supabase, params.id, showToast]);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.schema('api').rpc('admin_upsert_registry_item', {
                p_tab: 'disclaimers',
                p_data: {
                    id: params.id,
                    ...formData
                }
            });

            if (error) throw error;

            showToast('Compliance rule updated', 'success');
            setIsDirty(false);
            router.push('/dashboard/system/registry');
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    if (isFetching) return <div style={{ padding: '40px', opacity: 0.5 }}>Loading rule...</div>;

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
                title="Edit Compliance Rule"
                subtitle="Modify the legal binding for this tag."
                primaryAction={{
                    label: "Save Changes",
                    onClick: handleSave,
                    isLoading: isLoading
                }}
                onClose={handleClose}
            />

            <div className={adminStyles.formCard}>
                <div className={adminStyles.formGrid}>
                    <FormRow label="Rule Title">
                        <input
                            type="text"
                            className={adminStyles.input}
                            value={formData.title}
                            onChange={(e) => updateField('title', e.target.value)}
                        />
                    </FormRow>

                    <FormRow label="Target Tag">
                        <select
                            className={adminStyles.select}
                            value={formData.tag_id}
                            onChange={(e) => updateField('tag_id', e.target.value)}
                        >
                            {tags.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </FormRow>

                    <FormRow label="Effective Date">
                        <DatePicker
                            value={formData.effective_date}
                            onChange={(val) => updateField('effective_date', val)}
                            placeholder="dd/mm/yyyy"
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
                                <span style={{ fontSize: '14px' }}>Active</span>
                            </label>
                        </div>
                    </FormRow>

                    <FormRow label="Disclaimer Content" style={{ gridColumn: '1 / -1' }}>
                        <textarea
                            className={adminStyles.textarea}
                            rows={8}
                            value={formData.content}
                            onChange={(e) => updateField('content', e.target.value)}
                        />
                    </FormRow>
                </div>
            </div>
        </div>
    );
}
