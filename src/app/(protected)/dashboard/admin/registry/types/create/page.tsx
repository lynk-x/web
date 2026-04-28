"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { sanitizeInput } from '@/utils/sanitization';
import SubPageHeader from '@/components/shared/SubPageHeader';
import styles from '@/app/(protected)/dashboard/admin/settings/page.module.css';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';

export default function CreateTagTypePage() {
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const [formData, setFormData] = useState({
        id: '',
        description: '',
        is_active: true
    });

    const handleSave = async () => {
        if (!formData.id) {
            showToast('Type ID is required', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('tag_types')
                .insert([{
                    ...formData,
                    id: formData.id.toLowerCase().replace(/\s+/g, '_'),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);

            if (error) throw error;

            showToast('Tag type created successfully', 'success');
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

    return (
        <div className={styles.container}>
            <SubPageHeader
                title="Create Tag Type"
                subtitle="Define a new category to group related tags."
                primaryAction={{
                    label: "Create Type",
                    onClick: handleSave,
                    isLoading: isLoading
                }}
                isDirty={isDirty}
            />

            <div className={adminStyles.formCard}>
                <div className={adminStyles.formGrid}>
                    <div className={adminStyles.formGroup}>
                        <label className={adminStyles.label}>Type Identifier (ID)</label>
                        <input
                            type="text"
                            className={adminStyles.input}
                            placeholder="e.g. music_style"
                            value={formData.id}
                            onChange={(e) => updateField('id', e.target.value)}
                        />
                        <p style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>
                            Lowercase, use underscores for spaces.
                        </p>
                    </div>

                    <div className={adminStyles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label className={adminStyles.label}>Description</label>
                        <textarea
                            className={adminStyles.input}
                            rows={3}
                            placeholder="Describe what tags in this category represent..."
                            value={formData.description}
                            onChange={(e) => updateField('description', e.target.value)}
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
