"use client";

import React, { useState, useEffect } from 'react';
import styles from './ContentForm.module.css';
import { useRouter } from 'next/navigation';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { createClient } from '@/utils/supabase/client';
import { ContentItem } from '@/types/admin';
import { useToast } from '@/components/ui/Toast';
import CmsRenderer from '@/components/shared/CmsRenderer/CmsRenderer';

interface ContentFormProps {
    initialData?: Partial<ContentItem>;
    isEditing?: boolean;
    onDirtyChange?: (isDirty: boolean) => void;
    showActions?: boolean;
}

export default function ContentForm({ initialData, isEditing = false, onDirtyChange, showActions = true }: ContentFormProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const defaultData = {
        title: initialData?.title || '',
        slug: initialData?.slug || '',
        type: initialData?.type || 'page',
        status: initialData?.status || 'draft',
        content: initialData?.content?.description || initialData?.info?.description || '',
        info: initialData?.content || initialData?.info || {}
    };

    const [formData, setFormData] = useState(defaultData);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Dirty Check
    useEffect(() => {
        const isDirty = JSON.stringify(formData) !== JSON.stringify(defaultData);
        onDirtyChange?.(isDirty);

        if (isDirty) {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = '';
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, [formData, onDirtyChange]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (!touched[name]) {
            setTouched(prev => ({ ...prev, [name]: true }));
        }

        setFormData(prev => {
            const next = { ...prev, [name]: value };

            // Auto-generate slug from title if slug is empty or it was already matching title
            if (name === 'title') {
                const oldSlug = prev.slug;
                const autoSlug = '/' + prev.title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

                if (!oldSlug || oldSlug === autoSlug) {
                    next.slug = '/' + value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                }
            }

            return next;
        });
    };

    const handleContentChange = (content: string) => {
        setFormData(prev => ({
            ...prev,
            content
        }));
        if (!touched.content) {
            setTouched(prev => ({ ...prev, content: true }));
        }
    };

    const getInputClass = (name: string, baseClass: string) => {
        if (!touched[name]) return baseClass;
        const isValid = !!formData[name as keyof typeof formData];
        return `${baseClass} ${isValid ? 'input-success' : 'input-error'}`;
    };

    const renderValidationHint = (name: string) => {
        if (!touched[name]) return null;
        const isValid = !!formData[name as keyof typeof formData];
        return isValid ? (
            <div className="validation-hint success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Valid
            </div>
        ) : (
            <div className="validation-hint error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                Required
            </div>
        );
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        showToast(isEditing ? 'Updating content...' : 'Creating content...', 'info');

        try {
            const supabase = createClient();
            const payload = {
                title: formData.title,
                slug: formData.slug,
                type: formData.type,
                status: formData.status,
                content: {
                    ...formData.info,
                    description: formData.content
                },
                updated_at: new Date().toISOString(),
                // author_id would go here if we had auth context
            };

            let error;
            if (isEditing && initialData?.id) {
                const res = await supabase
                    .from('cms_pages')
                    .update(payload)
                    .eq('id', initialData.id);
                error = res.error;
            } else {
                const res = await supabase
                    .from('cms_pages')
                    .insert([payload]);
                error = res.error;
            }

            if (error) throw error;

            showToast(isEditing ? 'Content updated successfully!' : 'Content created successfully!', 'success');
            onDirtyChange?.(false);
            router.push('/dashboard/admin/communications?tab=content');
        } catch (err: any) {
            showToast(err.message || 'An error occurred', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.pageLayout}>
            <form id="content-form" onSubmit={handleSubmit} className={styles.container}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Content Title</label>
                    <input
                        type="text"
                        name="title"
                        className={getInputClass('title', styles.input)}
                        placeholder="e.g. Terms of Service"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                    />
                    {renderValidationHint('title')}
                </div>

                <div className={styles.row}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>URL Slug</label>
                        <input
                            type="text"
                            name="slug"
                            className={getInputClass('slug', styles.input)}
                            placeholder="/terms"
                            value={formData.slug}
                            onChange={handleInputChange}
                            required
                        />
                        {renderValidationHint('slug')}
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Content Type</label>
                        <select
                            name="type"
                            className={styles.select}
                            value={formData.type}
                            onChange={handleInputChange}
                        >
                            <option value="page">Page</option>
                            <option value="post">Blog Post</option>
                            <option value="announcement">Announcement</option>
                        </select>
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Status</label>
                    <select
                        name="status"
                        className={styles.select}
                        value={formData.status}
                        onChange={handleInputChange}
                    >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Body Content</label>
                    <div className={styles.editorContainer}>
                        <RichTextEditor
                            value={formData.content}
                            onChange={handleContentChange}
                            placeholder="Start writing your content here..."
                        />
                    </div>
                </div>

                {showActions && (
                    <div className={styles.actions}>
                        <button
                            type="submit"
                            className={`${styles.btn} ${styles.btnPrimary}`}
                        >
                            {isEditing ? 'Save Changes' : 'Create Content'}
                        </button>
                    </div>
                )}
            </form>

            <aside className={styles.previewSidebar}>
                <span className={styles.previewLabel}>Live Mobile Preview</span>
                <div className={styles.iphoneFrame}>
                    <div className={styles.iphoneNotch} />
                    <div className={styles.iphoneScreen}>
                        {formData.title || formData.content ? (
                            <div className={styles.previewContent}>
                                <h1 className={styles.previewTitle}>{formData.title || 'Untitled'}</h1>
                                <div className={styles.previewMeta}>
                                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • {formData.type}
                                </div>
                                <CmsRenderer content={formData.content} />
                            </div>
                        ) : (
                            <div className={styles.emptyPreview}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                                    <line x1="12" y1="18" x2="12.01" y2="18"></line>
                                </svg>
                                <p>Start typing to see the mobile preview</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </div>
    );
}
