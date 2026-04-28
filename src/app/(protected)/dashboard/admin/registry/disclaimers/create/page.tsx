"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import SubPageHeader from '@/components/shared/SubPageHeader';
import styles from '@/app/(protected)/dashboard/admin/settings/page.module.css';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';

export default function CreateDisclaimerPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [tags, setTags] = useState<{ id: string, name: string }[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        tag_id: '',
        effective_date: new Date().toISOString().split('T')[0],
        is_active: true
    });

    useEffect(() => {
        const fetchTags = async () => {
            const { data } = await supabase.from('tags').select('id, name').order('name');
            if (data) setTags(data);
        };
        fetchTags();
    }, [supabase]);

    const handleSave = async () => {
        if (!formData.title || !formData.content || !formData.tag_id) {
            showToast('All fields are required', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('disclaimers')
                .insert([{
                    ...formData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);

            if (error) throw error;

            showToast('Compliance rule created successfully', 'success');
            router.push('/dashboard/admin/registry');
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    return (
        <div className={styles.container}>
            <SubPageHeader
                title="New Compliance Rule"
                subtitle="Bind a legal disclaimer to a specific tag."
                primaryAction={{
                    label: "Create Rule",
                    onClick: handleSave,
                    isLoading: isLoading
                }}
                isDirty={isDirty}
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
                        <input
                            type={formData.effective_date ? "date" : "text"}
                            className={adminStyles.input}
                            value={formData.effective_date}
                            onChange={(e) => updateField('effective_date', e.target.value)}
                            placeholder="dd/mm/yyyy"
                            onFocus={(e) => (e.target.type = "date")}
                            onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
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
