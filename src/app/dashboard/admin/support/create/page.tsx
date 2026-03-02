"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import adminStyles from '../../page.module.css';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import SubPageHeader from '@/components/shared/SubPageHeader';

export default function CreateTicketPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [form, setForm] = useState({
        subject: '',
        priority: 'medium',
        body: '',
        admin_notes: ''
    });

    const handleChange = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!form.subject) {
            showToast('Subject is required', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('support_tickets')
                .insert([{
                    subject: form.subject,
                    priority: form.priority,
                    body: form.body,
                    admin_notes: form.admin_notes,
                    status: 'open'
                }]);

            if (error) throw error;

            showToast('Ticket created successfully', 'success');
            setIsDirty(false);
            router.push('/dashboard/admin/support');
        } catch (error: any) {
            showToast(error.message || 'Failed to create ticket', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <SubPageHeader
                title="Create New Ticket"
                subtitle="Manually log a new platform assistance request."
                isDirty={isDirty}
                primaryAction={{
                    label: 'Create Ticket',
                    onClick: () => handleSubmit(),
                    isLoading: isLoading
                }}
            />

            <div className={adminStyles.pageCard}>
                <form
                    onSubmit={handleSubmit}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '24px'
                    }}
                >
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className={adminStyles.label}>Subject</label>
                        <input
                            required
                            className={adminStyles.input}
                            value={form.subject}
                            onChange={e => handleChange('subject', e.target.value)}
                            placeholder="e.g. User reporting login failure on Android"
                        />
                    </div>

                    <div>
                        <label className={adminStyles.label}>Priority Level</label>
                        <select
                            className={adminStyles.select}
                            value={form.priority}
                            onChange={e => handleChange('priority', e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="low">Low (Standard Inquiry)</option>
                            <option value="medium">Medium (Requires Action)</option>
                            <option value="high">High (Blocked Feature)</option>
                            <option value="critical">Critical (System Outage)</option>
                        </select>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label className={adminStyles.label}>Original Request Detail</label>
                        <textarea
                            className={adminStyles.input}
                            value={form.body}
                            onChange={e => handleChange('body', e.target.value)}
                            rows={8}
                            placeholder="Paste the raw user request or detailed description here..."
                        />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label className={adminStyles.label}>Internal Workspace Notes</label>
                        <textarea
                            className={adminStyles.input}
                            value={form.admin_notes}
                            onChange={e => handleChange('admin_notes', e.target.value)}
                            rows={4}
                            placeholder="Add notes for the internal support team..."
                        />
                    </div>
                </form>
            </div>
        </div>
    );
}
