"use client";

import React, { useState, useEffect, useMemo } from 'react';
import styles from './page.module.css';
import { createClient } from '@/utils/supabase/client';
import { createSupportRepository } from '@/lib/repositories';
import { useToast } from '@/components/ui/Toast';
import type { SupportTicket } from '@/lib/repositories/support.repository';

export default function SupportDashboard() {
    const supabase = useMemo(() => createClient(), []);
    const supportRepo = useMemo(() => createSupportRepository(supabase), [supabase]);
    const { showToast } = useToast();

    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string>('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newTicket, setNewTicket] = useState({
        subject: '',
        message: '',
        priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent'
    });

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
                setUserEmail(session.user.email || '');
                fetchTickets(session.user.id);
            }
        };
        init();
    }, [supabase, supportRepo]);

    const fetchTickets = async (uid: string) => {
        setIsLoading(true);
        const { data, error } = await supportRepo.getUserTickets(uid, { pageSize: 50 });
        if (error) {
            showToast('Failed to load tickets', 'error');
        } else if (data) {
            setTickets(data);
        }
        setIsLoading(false);
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;

        setIsSubmitting(true);
        const { data, error } = await supportRepo.createTicket({
            user_id: userId,
            email: userEmail,
            subject: newTicket.subject,
            message: newTicket.message,
            priority: newTicket.priority
        });

        if (error) {
            showToast('Failed to create ticket', 'error');
        } else if (data) {
            showToast('Support ticket created successfully!', 'success');
            setTickets([data, ...tickets]);
            setIsModalOpen(false);
            setNewTicket({ subject: '', message: '', priority: 'normal' });
        }
        setIsSubmitting(false);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Help & Support</h1>
                    <p className={styles.subtitle}>Manage your support tickets and get assistance from our team.</p>
                </div>
                <button className={styles.createBtn} onClick={() => setIsModalOpen(true)}>
                    + New Ticket
                </button>
            </div>

            {isLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Loading tickets...</div>
            ) : tickets.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                    <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>No Support Tickets</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>You haven't opened any support requests yet.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {tickets.map(ticket => (
                        <div key={ticket.id} className={styles.ticketCard} onClick={() => showToast('Ticket details view coming soon', 'info')}>
                            <div className={styles.ticketHeader}>
                                <div>
                                    <h3 className={styles.ticketTitle}>{ticket.subject}</h3>
                                    <span className={styles.ticketRef}>{ticket.reference}</span>
                                </div>
                                <span className={`${styles.statusBadge} ${styles['status_' + ticket.status]}`}>
                                    {ticket.status}
                                </span>
                            </div>
                            <div className={styles.ticketMeta}>
                                <span>{formatDate(ticket.created_at)}</span>
                                <span className={styles['priority_' + ticket.priority]}>
                                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2 className={styles.modalTitle}>Create Support Ticket</h2>
                        <form onSubmit={handleCreateTicket}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Subject</label>
                                <input 
                                    required
                                    className={styles.input} 
                                    placeholder="Brief summary of your issue"
                                    value={newTicket.subject}
                                    onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Priority</label>
                                <select 
                                    className={styles.select}
                                    value={newTicket.priority}
                                    onChange={e => setNewTicket({...newTicket, priority: e.target.value as any})}
                                >
                                    <option value="low">Low - General Question</option>
                                    <option value="normal">Normal - Issue / Bug</option>
                                    <option value="high">High - Blocking my work</option>
                                    <option value="urgent">Urgent - Platform outage / Security</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Message</label>
                                <textarea 
                                    required
                                    className={styles.textarea} 
                                    placeholder="Please describe your issue in detail..."
                                    value={newTicket.message}
                                    onChange={e => setNewTicket({...newTicket, message: e.target.value})}
                                />
                            </div>
                            <div className={styles.btnRow}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                                    {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
