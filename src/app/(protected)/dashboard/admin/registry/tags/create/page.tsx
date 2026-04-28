"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { sanitizeInput } from '@/utils/sanitization';
import SubPageHeader from '@/components/shared/SubPageHeader';
import styles from '@/app/(protected)/dashboard/admin/settings/page.module.css';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';

export default function CreateTagPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(false);
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
        const fetchTypes = async () => {
            const { data } = await supabase.from('tag_types').select('id').eq('is_active', true);
            if (data) setTagTypes(data);
        };
        fetchTypes();
    }, [supabase]);

    const handleSave = async () => {
        if (!formData.name || !formData.slug) {
            showToast('Name and Slug are required', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('tags')
                .insert([{
                    ...formData,
                    use_count: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);

            if (error) throw error;

            showToast('Tag created successfully', 'success');
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

        // Auto-slugify if slug is empty or matched previous name
        if (field === 'name' && (!formData.slug || formData.slug === formData.name.toLowerCase().replace(/\s+/g, '-'))) {
            setFormData(prev => ({ ...prev, name: value, slug: value.toLowerCase().replace(/\s+/g, '-') }));
        }
    };

    return (
        <div className={styles.container}>
            <SubPageHeader
                title="Create New Tag"
                subtitle="Add a new classification tag to the global registry."
                primaryAction={{
                    label: "Create Tag",
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
                            placeholder="e.g. Jazz Music"
                            value={formData.name}
                            onChange={(e) => updateField('name', e.target.value)}
                        />
                    </div>

                    <div className={adminStyles.formGroup}>
                        <label className={adminStyles.label}>URL Slug</label>
                        <input
                            type="text"
                            className={adminStyles.input}
                            placeholder="e.g. jazz-music"
                            value={formData.slug}
                            onChange={(e) => updateField('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
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
                        <label className={adminStyles.label}>Ownership</label>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.is_official}
                                    onChange={(e) => updateField('is_official', e.target.checked)}
                                />
                                <span style={{ fontSize: '14px' }}>Official Tag</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
