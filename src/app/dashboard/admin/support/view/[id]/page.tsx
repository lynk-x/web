"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from '../../page.module.css';
import adminStyles from '../../../page.module.css';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import SubPageHeader from '@/components/shared/SubPageHeader';
import Badge from '@/components/shared/Badge';

export default function ViewTicketPage() {
    const router = useRouter();
    const { id } = useParams();
    const { showToast } = useToast();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(true);
    const [ticket, setTicket] = useState<any>(null);

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
                setTicket(data);
            } catch (error: any) {
                showToast(error.message || 'Failed to fetch ticket', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchTicket();
    }, [id, supabase, showToast]);

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                    <svg className={adminStyles.spinner} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                </div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className={styles.container}>
                <SubPageHeader title="Ticket Not Found" />
                <div className={adminStyles.pageCard}>
                    <p>The requested ticket could not be found or has been deleted.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <SubPageHeader
                title={ticket.subject}
                subtitle={`Ticket Reference: ${ticket.reference || ticket.id.slice(0, 8)}`}
                primaryAction={{
                    label: 'Edit Ticket',
                    onClick: () => router.push(`/dashboard/admin/support/edit/${id}`)
                }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className={adminStyles.pageCard}>
                        <h3 className={adminStyles.label} style={{ opacity: 1, fontSize: '15px', marginBottom: '16px' }}>Description</h3>
                        <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', opacity: 0.9 }}>
                            {ticket.body || "No description provided."}
                        </p>
                    </div>

                    <div className={adminStyles.pageCard}>
                        <h3 className={adminStyles.label} style={{ opacity: 1, fontSize: '15px', marginBottom: '16px' }}>Internal Notes</h3>
                        <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', opacity: 0.8, fontStyle: 'italic' }}>
                            {ticket.admin_notes || "No internal notes preserved for this ticket."}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className={adminStyles.pageCard}>
                        <h3 className={adminStyles.label} style={{ opacity: 1, fontSize: '15px', marginBottom: '16px' }}>Metadata</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <span className={adminStyles.label}>Status</span>
                                <Badge
                                    label={ticket.status.toUpperCase()}
                                    variant={ticket.status === 'open' ? 'error' : 'success'}
                                    showDot
                                />
                            </div>

                            <div>
                                <span className={adminStyles.label}>Priority</span>
                                <Badge
                                    label={ticket.priority.toUpperCase()}
                                    variant={ticket.priority === 'critical' ? 'error' : ticket.priority === 'high' ? 'warning' : 'info'}
                                />
                            </div>

                            <div>
                                <span className={adminStyles.label}>Created At</span>
                                <div style={{ fontSize: '14px' }}>{new Date(ticket.created_at).toLocaleString()}</div>
                            </div>

                            <div>
                                <span className={adminStyles.label}>Last Updated</span>
                                <div style={{ fontSize: '14px' }}>{new Date(ticket.updated_at).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
