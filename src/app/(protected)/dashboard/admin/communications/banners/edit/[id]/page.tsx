"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import SubPageHeader from '@/components/shared/SubPageHeader';
import Badge from '@/components/shared/Badge';

export default function EditBannerPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { showToast } = useToast();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [type, setType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [isActive, setIsActive] = useState(false);
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [actionUrl, setActionUrl] = useState('');

    useEffect(() => {
        async function fetchBanner() {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('system_banners')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (data) {
                    setTitle(data.title);
                    setContent(data.content);
                    setType(data.type);
                    setIsActive(data.is_active);
                    setStartsAt(new Date(data.starts_at).toISOString().slice(0, 16));
                    if (data.ends_at) setEndsAt(new Date(data.ends_at).toISOString().slice(0, 16));
                    setActionUrl(data.action_url || '');
                    setIsDirty(false);
                }
            } catch (err: any) {
                showToast(err.message, 'error');
                router.push('/dashboard/admin/communications?tab=banners');
            } finally {
                setIsLoading(false);
            }
        }
        if (id) fetchBanner();
    }, [id, supabase, router, showToast]);

    const handleChange = (setter: any, value: any) => {
        setter(value);
        setIsDirty(true);
    };

    const handleUpdateBanner = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!title || !content || !startsAt) {
            showToast('Title, content, and start date are required', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('system_banners')
                .update({
                    title,
                    content,
                    type,
                    is_active: isActive,
                    starts_at: new Date(startsAt).toISOString(),
                    ends_at: endsAt ? new Date(endsAt).toISOString() : null,
                    action_url: actionUrl || null
                })
                .eq('id', id);

            if (error) throw error;

            showToast('System banner updated successfully', 'success');
            setIsDirty(false);
            router.push('/dashboard/admin/communications?tab=banners');
        } catch (error: any) {
            showToast(error.message || 'Failed to update banner', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div style={{ padding: '80px', textAlign: 'center', opacity: 0.5 }}>Loading banner details...</div>;
    }

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Edit System Banner"
                subtitle={`Modifying ID: ${id}`}
                isDirty={isDirty}
                primaryAction={{
                    label: 'Save Changes',
                    onClick: () => handleUpdateBanner(),
                    isLoading: isSubmitting
                }}
            />

            <div className={adminStyles.subPageGrid}>
                <div className={adminStyles.pageCard}>
                    <h2 className={adminStyles.sectionTitle}>Banner Details</h2>
                    <form className={adminStyles.form} onSubmit={handleUpdateBanner}>
                        <div className={adminStyles.formGrid}>
                            <div className={adminStyles.inputGroup}>
                                <label className={adminStyles.label}>Banner Type</label>
                                <select
                                    className={adminStyles.select}
                                    value={type}
                                    onChange={(e) => handleChange(setType, e.target.value as 'info' | 'warning' | 'success' | 'danger')}
                                >
                                    <option value="info">Information (Blue)</option>
                                    <option value="success">Success (Green)</option>
                                    <option value="warning">Warning (Yellow)</option>
                                    <option value="error">Error (Red)</option>
                                </select>
                            </div>
                            <div className={adminStyles.inputGroup} style={{ alignSelf: 'center', paddingTop: '20px' }}>
                                <label className={adminStyles.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={(e) => handleChange(setIsActive, e.target.checked)}
                                    />
                                    Active banner
                                </label>
                            </div>
                        </div>

                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Headline Title</label>
                            <input
                                type="text"
                                placeholder="e.g. Server Maintenance"
                                className={adminStyles.input}
                                value={title}
                                onChange={(e) => handleChange(setTitle, e.target.value)}
                                required
                            />
                        </div>

                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Banner Message</label>
                            <textarea
                                className={adminStyles.textarea}
                                placeholder="Describe the alert in detail..."
                                value={content}
                                onChange={(e) => handleChange(setContent, e.target.value)}
                                required
                            />
                        </div>

                        <div className={adminStyles.formGrid}>
                            <div className={adminStyles.inputGroup}>
                                <label className={adminStyles.label}>Starts At</label>
                                <input
                                    type="datetime-local"
                                    className={adminStyles.input}
                                    value={startsAt}
                                    onChange={(e) => handleChange(setStartsAt, e.target.value)}
                                    required
                                />
                            </div>
                            <div className={adminStyles.inputGroup}>
                                <label className={adminStyles.label}>Ends At (Optional)</label>
                                <input
                                    type="datetime-local"
                                    className={adminStyles.input}
                                    value={endsAt}
                                    onChange={(e) => handleChange(setEndsAt, e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Action URL (Optional)</label>
                            <input
                                type="text"
                                placeholder="https://example.com/more-info"
                                className={adminStyles.input}
                                value={actionUrl}
                                onChange={(e) => handleChange(setActionUrl, e.target.value)}
                            />
                        </div>
                    </form>
                </div>

                <div className={adminStyles.formSection}>
                    <div className={adminStyles.pageCard}>
                        <h2 className={adminStyles.sectionTitle}>Visual Preview</h2>
                        <div style={{
                            padding: '16px',
                            background: type === 'info' ? 'rgba(33, 150, 243, 0.1)' :
                                type === 'success' ? 'rgba(76, 175, 80, 0.1)' :
                                    type === 'warning' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                            borderLeft: `4px solid ${type === 'info' ? '#2196f3' :
                                type === 'success' ? '#4caf50' :
                                    type === 'warning' ? '#ffc107' : '#f44336'
                                }`,
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{ flexShrink: 0 }}>
                                {type === 'info' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2196f3" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>}
                                {type === 'success' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>}
                                {type === 'warning' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffc107" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
                                {type === 'error' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>}
                            </div>
                            <div style={{ fontSize: '14px' }}>
                                <strong>{title || 'Headline Title'}:</strong> {content || 'Draft content will appear here...'}
                            </div>
                        </div>

                        <div style={{ marginTop: '24px', display: 'flex', gap: '8px' }}>
                            <Badge label={type.toUpperCase()} variant={type as 'info' | 'warning' | 'success' | 'error'} />
                            {isActive && <Badge label="ACTIVE" variant="success" showDot />}
                            {!isActive && <Badge label="INACTIVE" variant="neutral" />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
