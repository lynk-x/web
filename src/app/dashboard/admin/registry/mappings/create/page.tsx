"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import Badge from '@/components/shared/Badge';
import type { ActionItem } from '@/types/shared';
import SubPageHeader from '@/components/shared/SubPageHeader';
import styles from '@/app/dashboard/admin/settings/page.module.css';
import adminStyles from '@/app/dashboard/admin/page.module.css';

export default function CreateMappingPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(false);
    const [mappingType, setMappingType] = useState<'category' | 'event'>('category');

    // Lists for selection
    const [tags, setTags] = useState<{ id: string, name: string }[]>([]);
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
    const [events, setEvents] = useState<{ id: string, title: string }[]>([]);

    const [formData, setFormData] = useState({
        category_id: '',
        event_id: '',
        tag_id: '',
        is_primary: false
    });

    useEffect(() => {
        const loadRefs = async () => {
            const [tagsRes, catsRes, evtsRes] = await Promise.all([
                supabase.from('tags').select('id, name').order('name'),
                supabase.from('event_categories').select('id, name').order('name'),
                supabase.from('events').select('id, title').order('created_at', { ascending: false }).limit(100)
            ]);
            if (tagsRes.data) setTags(tagsRes.data);
            if (catsRes.data) setCategories(catsRes.data);
            if (evtsRes.data) setEvents(evtsRes.data);
        };
        loadRefs();
    }, [supabase]);

    const handleSave = async () => {
        if (!formData.tag_id || (mappingType === 'category' && !formData.category_id) || (mappingType === 'event' && !formData.event_id)) {
            showToast('Please select both a target and a tag', 'error');
            return;
        }

        setIsLoading(true);
        try {
            if (mappingType === 'category') {
                const { error } = await supabase
                    .from('category_tags')
                    .insert([{
                        category_id: formData.category_id,
                        tag_id: formData.tag_id,
                        is_primary: formData.is_primary
                    }]);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('event_tags')
                    .insert([{
                        event_id: formData.event_id,
                        tag_id: formData.tag_id
                    }]);
                if (error) throw error;
            }

            showToast('Mapping successfully created', 'success');
            router.push('/dashboard/admin/registry');
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <SubPageHeader
                title="Create Tag Mapping"
                subtitle="Link tags to categories or specific events."
                primaryAction={{
                    label: "Save Mapping",
                    onClick: handleSave,
                    isLoading: isLoading
                }}
                isDirty={true}
            />

            <div className={adminStyles.formCard}>
                <div style={{ marginBottom: '24px' }}>
                    <label className={adminStyles.label}>Mapping Scope</label>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button
                            className={mappingType === 'category' ? adminStyles.btnPrimary : adminStyles.btnSecondary}
                            onClick={() => setMappingType('category')}
                            style={{ padding: '8px 16px' }}
                        >
                            Category Logic
                        </button>
                        <button
                            className={mappingType === 'event' ? adminStyles.btnPrimary : adminStyles.btnSecondary}
                            onClick={() => setMappingType('event')}
                            style={{ padding: '8px 16px' }}
                        >
                            Event Specific
                        </button>
                    </div>
                </div>

                <div className={adminStyles.formGrid}>
                    {mappingType === 'category' ? (
                        <div className={adminStyles.formGroup}>
                            <label className={adminStyles.label}>Event Category</label>
                            <select
                                className={adminStyles.input}
                                value={formData.category_id}
                                onChange={(e) => setFormData(p => ({ ...p, category_id: e.target.value }))}
                            >
                                <option value="">Select category...</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className={adminStyles.formGroup}>
                            <label className={adminStyles.label}>Event</label>
                            <select
                                className={adminStyles.input}
                                value={formData.event_id}
                                onChange={(e) => setFormData(p => ({ ...p, event_id: e.target.value }))}
                            >
                                <option value="">Select event...</option>
                                {events.map(e => (
                                    <option key={e.id} value={e.id}>{e.title}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className={adminStyles.formGroup}>
                        <label className={adminStyles.label}>Tag to Associate</label>
                        <select
                            className={adminStyles.input}
                            value={formData.tag_id}
                            onChange={(e) => setFormData(p => ({ ...p, tag_id: e.target.value }))}
                        >
                            <option value="">Select tag...</option>
                            {tags.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {mappingType === 'category' && (
                        <div className={adminStyles.formGroup} style={{ display: 'flex', alignItems: 'center', paddingTop: '32px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.is_primary}
                                    onChange={(e) => setFormData(p => ({ ...p, is_primary: e.target.checked }))}
                                />
                                <span style={{ fontSize: '14px' }}>Primary Tag for this Category</span>
                            </label>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
