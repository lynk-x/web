"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/dashboard/PageHeader';
import styles from '@/app/(protected)/dashboard/admin/settings/page.module.css';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { DatePicker } from '@/components/ui/DatePicker';
import { useConfirmModal } from '@/hooks/useConfirmModal';

export default function CreateDisclaimerPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient().schema('api' as any), []);
    const { confirm, ConfirmDialog } = useConfirmModal();

    const [isLoading, setIsLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [tags, setTags] = useState<{ id: string, name: string }[]>([]);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        tag_id: '',
        effective_date: new Date().toISOString().split('T')[0],
        is_active: true
    });

    useEffect(() => {
        const fetchTags = async () => {
            const { data, error } = await supabase.schema('api').rpc('get_admin_registry_data', { p_tab: 'tags' });
            if (error) {
                showToast(getErrorMessage(error), 'error');
                return;
            }
            if (data) setTags(data);
        };
        fetchTags();
    }, [supabase, showToast]);

    const handleSave = async () => {
        if (!formData.title || !formData.content || !formData.tag_id) {
            showToast('All fields are required', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.schema('api').rpc('admin_upsert_registry_item', {
                p_tab: 'disclaimers',
                p_data: formData
            });

            if (error) throw error;

            showToast('Compliance rule created successfully', 'success');
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
                title="New Compliance Rule"
                subtitle="Bind a legal disclaimer to a specific tag."
                primaryAction={{
                    label: "Create Rule",
                    onClick: handleSave,
                    isLoading: isLoading
                }}
                onClose={handleClose}
            />

            <div className={adminStyles.formCard}>
                <div className={adminStyles.formGrid}>
                    <div className={adminStyles.formGroup} style={{ gridColumn: '1 / span 1' }}>
                        <label className={adminStyles.label}>Rule Title</label>
                        <input
                            type="text"
                            className={adminStyles.input}
                            placeholder="e.g. Alcohol Warning"
                            value={formData.title}
                            onChange={(e) => updateField('title', e.target.value)}
                        />
                    </div>

                    <div className={adminStyles.formGroup} style={{ gridColumn: '2 / span 1' }}>
                        <label className={adminStyles.label}>Target Tag</label>
                        <select
                            className={adminStyles.input}
                            value={formData.tag_id}
                            onChange={(e) => updateField('tag_id', e.target.value)}
                        >
                            <option value="">Select a tag...</option>
                            {tags.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={adminStyles.formGroup} style={{ gridColumn: '1 / span 1' }}>
                        <label className={adminStyles.label}>Effective Date</label>
                        <DatePicker
                            value={formData.effective_date}
                            onChange={(val) => updateField('effective_date', val)}
                            placeholder="dd/mm/yyyy"
                        />
                    </div>

                    <div className={adminStyles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label className={adminStyles.label}>Disclaimer Content</label>
                        <textarea
                            className={adminStyles.input}
                            rows={6}
                            placeholder="Detailed legal text..."
                            value={formData.content}
                            onChange={(e) => updateField('content', e.target.value)}
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
