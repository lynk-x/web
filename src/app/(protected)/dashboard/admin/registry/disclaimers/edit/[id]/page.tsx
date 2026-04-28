"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import SubPageHeader from '@/components/shared/SubPageHeader';
import styles from '@/app/dashboard/admin/settings/page.module.css';
import adminStyles from '@/app/dashboard/admin/page.module.css';

export default function EditDisclaimerPage() {
    const router = useRouter();
    const params = useParams();
    const { showToast } = useToast();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const [tags, setTags] = useState<{ id: string, name: string }[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        tag_id: '',
        effective_date: '',
        is_active: true
    });

    useEffect(() => {
        const load = async () => {
            const [tagsRes, ruleRes] = await Promise.all([
                supabase.from('tags').select('id, name').order('name'),
                supabase.from('disclaimers').select('*').eq('id', params.id).single()
            ]);

            if (tagsRes.data) setTags(tagsRes.data);
            if (ruleRes.data) {
                setFormData({
                    title: ruleRes.data.title,
                    content: ruleRes.data.content,
                    tag_id: ruleRes.data.tag_id,
                    effective_date: ruleRes.data.effective_date.split('T')[0],
                    is_active: ruleRes.data.is_active
                });
            }
            setIsFetching(false);
        };
        load();
    }, [supabase, params.id]);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('disclaimers')
                .update({
                    ...formData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', params.id);

            if (error) throw error;

            showToast('Compliance rule updated', 'success');
            setIsDirty(false);
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

    if (isFetching) return <div style={{ padding: '40px', opacity: 0.5 }}>Loading rule...</div>;

    return (
        <div className={styles.container}>
            <SubPageHeader
                title="Edit Compliance Rule"
                subtitle="Modify the legal binding for this tag."
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
                        <label className={adminStyles.label}>Rule Title</label>
                        <input
                            type="text"
                            className={adminStyles.input}
                            value={formData.title}
                            onChange={(e) => updateField('title', e.target.value)}
                        />
                    </div>

                    <div className={adminStyles.formGroup}>
                        <label className={adminStyles.label}>Target Tag</label>
                        <select
                            className={adminStyles.input}
                            value={formData.tag_id}
                            onChange={(e) => updateField('tag_id', e.target.value)}
                        >
                            {tags.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={adminStyles.formGroup}>
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

                    <div className={adminStyles.formGroup}>
                        <label className={adminStyles.label}>Status</label>
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
                    </div>

                    <div className={adminStyles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label className={adminStyles.label}>Disclaimer Content</label>
                        <textarea
                            className={adminStyles.input}
                            rows={8}
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
