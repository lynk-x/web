"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from '../../page.module.css';
import adminStyles from '../../../page.module.css';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import SubPageHeader from '@/components/shared/SubPageHeader';

export default function EditTicketPage() {
    const router = useRouter();
    const { id } = useParams();
    const { showToast } = useToast();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const [form, setForm] = useState({
        subject: '',
        priority: 'medium',
        status: 'open',
        body: '',
        admin_notes: ''
    });

    useEffect(() => {
        const fetchTicket = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('support_tickets')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (data) {
                    setForm({
                        subject: data.subject || '',
                        priority: data.priority || 'medium',
                        status: data.status || 'open',
                        body: data.body || '',
                        admin_notes: data.admin_notes || ''
                    });
                }
            } catch (error: any) {
                showToast(error.message || 'Failed to fetch ticket', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchTicket();
    }, [id, supabase, showToast]);

    const handleChange = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('support_tickets')
                .update({
                    subject: form.subject,
                    priority: form.priority,
                    status: form.status,
                    body: form.body,
                    admin_notes: form.admin_notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            showToast('Ticket updated successfully', 'success');
            setIsDirty(false);
            router.push('/dashboard/admin/support');
        } catch (error: any) {
            showToast(error.message || 'Failed to update ticket', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                    <svg className={adminStyles.spinner} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <SubPageHeader
                title="Edit Support Ticket"
                subtitle={`Updating ticket reference: ${id?.toString().slice(0, 8)}`}
                isDirty={isDirty}
                primaryAction={{
                    label: 'Update Ticket',
                    onClick: () => handleSubmit(),
                    isLoading: isSaving
                }}
            />

            <div className={adminStyles.pageCard}>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className={adminStyles.label}>Subject</label>
                        <input
                            required
                            className={adminStyles.input}
                            value={form.subject}
                            onChange={e => handleChange('subject', e.target.value)}
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
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>

                    <div>
                        <label className={adminStyles.label}>Processing Status</label>
                        <select
                            className={adminStyles.select}
                            value={form.status}
                            onChange={e => handleChange('status', e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label className={adminStyles.label}>Detailed Description</label>
                        <textarea
                            className={adminStyles.input}
                            value={form.body}
                            onChange={e => handleChange('body', e.target.value)}
                            rows={8}
                        />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label className={adminStyles.label}>Internal Workspace Notes</label>
                        <textarea
                            className={adminStyles.input}
                            value={form.admin_notes}
                            onChange={e => handleChange('admin_notes', e.target.value)}
                            rows={4}
                        />
                    </div>
                </form>
            </div>
        </div>
    );
}
