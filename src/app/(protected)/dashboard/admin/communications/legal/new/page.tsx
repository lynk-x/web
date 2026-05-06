"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './NewLegalVersion.module.css';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import SubPageHeader from '@/components/shared/SubPageHeader';
import RichTextEditor from '@/components/ui/RichTextEditor';
import Badge from '@/components/shared/Badge';
import CmsRenderer from '@/components/shared/CmsRenderer/CmsRenderer';
import { formatDate } from '@/utils/format';

export default function NewLegalVersionPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [version, setVersion] = useState('');
    const [type, setType] = useState<any>('terms_of_service');
    const [is_active, setIsActive] = useState(false);
    const [effective_date, setEffectiveDate] = useState('');

    const handleChange = (setter: any, value: any) => {
        setter(value);
        setIsDirty(true);
    };

    const handleCreateVersion = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!title || !content || !version || !effective_date) {
            showToast('All fields except "Activate" are required', 'error');
            return;
        }

        setIsLoading(true);
        try {
            if (is_active) {
                await supabase
                    .from('legal_documents')
                    .update({ is_active: false })
                    .eq('type', type);
            }

            const { error } = await supabase
                .from('legal_documents')
                .insert([{
                    title,
                    content,
                    version,
                    type,
                    is_active,
                    effective_date: new Date(effective_date).toISOString()
                }]);

            if (error) throw error;

            showToast('Legal document version created successfully', 'success');
            setIsDirty(false);
            router.push('/dashboard/admin/communications?tab=legal');
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to create document', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <SubPageHeader
                title="New Legal Version"
                subtitle="Draft a new version of policies, terms or agreements."
                isDirty={isDirty}
                primaryAction={{
                    label: 'Publish Version',
                    onClick: () => handleCreateVersion(),
                    isLoading: isLoading
                }}
            />

            <div className={styles.pageLayout}>
                <div className={styles.editorSection}>
                    <div className={adminStyles.pageCard}>
                        <h2 className={adminStyles.sectionTitle}>Document Content</h2>
                        <form className={adminStyles.form} onSubmit={handleCreateVersion}>
                            <div className={adminStyles.inputGroup}>
                                <label className={adminStyles.label}>Document Type</label>
                                <select
                                    className={adminStyles.select}
                                    value={type}
                                    onChange={(e) => handleChange(setType, e.target.value)}
                                >
                                    <option value="terms_of_service">Terms of Service</option>
                                    <option value="privacy_policy">Privacy Policy</option>
                                    <option value="organizer_agreement">Organizer Agreement</option>
                                    <option value="cookie_policy">Cookie Policy</option>
                                    <option value="refund_policy">Refund Policy</option>
                                </select>
                            </div>

                            <div className={adminStyles.inputGroup}>
                                <label className={adminStyles.label}>Title</label>
                                <input
                                    type="text"
                                    placeholder="Display title for users..."
                                    className={adminStyles.input}
                                    value={title}
                                    onChange={(e) => handleChange(setTitle, e.target.value)}
                                    required
                                />
                            </div>

                            <div className={adminStyles.inputGroup}>
                                <label className={adminStyles.label}>Rich Text Editor</label>
                                <RichTextEditor
                                    value={content}
                                    onChange={(val) => handleChange(setContent, val)}
                                    placeholder="Paste or write the legal text here..."
                                />
                            </div>
                        </form>
                    </div>

                    <div className={adminStyles.pageCard}>
                        <h2 className={adminStyles.sectionTitle}>Version Strategy</h2>

                        <div className={adminStyles.formGrid}>
                            <div className={adminStyles.inputGroup}>
                                <label className={adminStyles.label}>Version Identifier</label>
                                <input
                                    type="text"
                                    placeholder="e.g. v3.4.0"
                                    className={adminStyles.input}
                                    value={version}
                                    onChange={(e) => handleChange(setVersion, e.target.value)}
                                    required
                                />
                            </div>

                            <div className={adminStyles.inputGroup}>
                                <label className={adminStyles.label}>Effective Date</label>
                                <input
                                    type={effective_date ? "date" : "text"}
                                    className={adminStyles.input}
                                    value={effective_date}
                                    onChange={(e) => handleChange(setEffectiveDate, e.target.value)}
                                    placeholder="dd/mm/yyyy"
                                    onFocus={(e) => (e.target.type = "date")}
                                    onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--color-interface-outline)' }}>
                            <label className={adminStyles.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', margin: 0 }}>
                                <input
                                    type="checkbox"
                                    style={{ width: '18px', height: '18px' }}
                                    checked={is_active}
                                    onChange={(e) => handleChange(setIsActive, e.target.checked)}
                                />
                                <div>
                                    <div style={{ fontWeight: 600 }}>Activate Automatically</div>
                                    <div style={{ fontSize: '12px', opacity: 0.6 }}>Activating this version will automatically archive the previous live version.</div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <aside className={styles.previewSidebar}>
                    <span className={styles.previewLabel}>Legal Mobile Preview</span>
                    <div className={styles.iphoneFrame}>
                        <div className={styles.iphoneNotch} />
                        <div className={styles.iphoneScreen}>
                            {title || content ? (
                                <div className={styles.previewContent}>
                                    <h1 className={styles.previewTitle}>{title || 'Untitled Document'}</h1>
                                    <div className={styles.previewMeta}>
                                        {type.replace('_', ' ')} • {version || 'Draft'}
                                        {effective_date && <div style={{ marginTop: '4px' }}>Effective: {formatDate(effective_date)}</div>}
                                    </div>
                                    <CmsRenderer content={content} />
                                </div>
                            ) : (
                                <div className={styles.emptyPreview}>
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>
                                    <p>Draft your legal text to see the live preview</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={adminStyles.pageCard} style={{ background: 'rgba(255, 193, 7, 0.05)', border: '1px solid rgba(255, 193, 7, 0.2)', width: '100%' }}>
                        <h2 className={adminStyles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffc107" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            Compliance Note
                        </h2>
                        <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px', lineHeight: '1.5' }}>
                            Changes to legal documents may require users to re-accept terms on their next login.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
