"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../page.module.css';
import adminStyles from '../../../page.module.css';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import SubPageHeader from '@/components/shared/SubPageHeader';
import RichTextEditor from '@/components/ui/RichTextEditor';
import Badge from '@/components/shared/Badge';

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
            // If activating, deactivate others of same type? Or let DB trigger handle it?
            // Usually, we should deactivate others.
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
        } catch (error: any) {
            showToast(error.message || 'Failed to create document', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <SubPageHeader
                title="New Legal Version"
                subtitle="Draft a new version of policies, terms, or agreements."
                isDirty={isDirty}
                primaryAction={{
                    label: 'Publish Version',
                    onClick: () => handleCreateVersion(),
                    isLoading: isLoading
                }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
                <div className={adminStyles.pageCard}>
                    <h2 className={adminStyles.sectionTitle} style={{ marginBottom: '24px' }}>Document Content</h2>
                    <form className={adminStyles.form} onSubmit={handleCreateVersion}>
                        <div>
                            <label className={adminStyles.label}>Document Type</label>
                            <select
                                className={adminStyles.select}
                                style={{ width: '100%' }}
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

                        <div>
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

                        <div>
                            <label className={adminStyles.label}>Rich Text Editor</label>
                            <RichTextEditor
                                value={content}
                                onChange={(val) => handleChange(setContent, val)}
                                placeholder="Paste or write the legal text here..."
                            />
                        </div>
                    </form>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className={adminStyles.pageCard}>
                        <h2 className={adminStyles.sectionTitle} style={{ marginBottom: '24px' }}>Version Strategy</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
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

                            <div>
                                <label className={adminStyles.label}>Effective Date</label>
                                <input
                                    type="date"
                                    className={adminStyles.input}
                                    value={effective_date}
                                    onChange={(e) => handleChange(setEffectiveDate, e.target.value)}
                                    required
                                />
                            </div>

                            <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
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

                        <div style={{ marginTop: '32px' }}>
                            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, marginBottom: '12px' }}>Publish Preview</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Badge label={type.replace('_', ' ').toUpperCase()} variant="info" />
                                <Badge label={version || 'v?.?'} variant="neutral" />
                                {is_active && <Badge label="LIVE ON SAVE" variant="success" showDot />}
                            </div>
                        </div>
                    </div>

                    <div className={adminStyles.pageCard} style={{ background: 'rgba(255, 193, 7, 0.05)', border: '1px solid rgba(255, 193, 7, 0.2)' }}>
                        <h2 className={adminStyles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffc107" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            Compliance Note
                        </h2>
                        <p style={{ fontSize: '13px', opacity: 0.8, marginTop: '8px', lineHeight: '1.5' }}>
                            Changes to legal documents may require users to re-accept terms on their next login if "Compulsory Consent" flag is enabled in Regional Settings.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
