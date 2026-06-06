"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { createClient } from '@/utils/supabase/client';
import { createSupportRepository } from '@/lib/repositories';
import { useToast } from '@/components/ui/Toast';
import type { SupportTicket, SupportTicketMessage } from '@/lib/repositories/support.repository';

export default function SupportDashboard() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const supportRepo = useMemo(() => createSupportRepository(supabase), [supabase]);
    const { showToast } = useToast();

    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string>('');

    // Selected Ticket State (Chat View)
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [newMessageContent, setNewMessageContent] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

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
            
            // Automatically insert the initial message so it shows in the chat view
            await supportRepo.addMessage(data.id, newTicket.message, userId);
        }
        setIsSubmitting(false);
    };

    const handleTicketClick = async (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        setIsMessagesLoading(true);
        const { data, error } = await supportRepo.getTicketMessages(ticket.id);
        if (error) {
            showToast('Failed to load messages', 'error');
        } else if (data) {
            setMessages(data);
        }
        setIsMessagesLoading(false);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicket || !newMessageContent.trim() || !userId) return;

        setIsSendingMessage(true);
        const { data, error } = await supportRepo.addMessage(selectedTicket.id, newMessageContent, userId);
        
        if (error) {
            showToast('Failed to send message', 'error');
        } else if (data) {
            setMessages(prev => [...prev, data]);
            setNewMessageContent('');
        }
        setIsSendingMessage(false);
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
        <div className={sharedStyles.container}>
            <button 
                className={styles.backBtn} 
                onClick={() => selectedTicket ? setSelectedTicket(null) : router.back()} 
                style={{ marginBottom: '-8px', alignSelf: 'flex-start' }}
            >
                &larr; {selectedTicket ? "Back to Tickets" : "Return to Dashboard"}
            </button>
            <div style={{ marginBottom: '24px' }}>
                {selectedTicket ? (
                    <PageHeader
                        title={selectedTicket.subject}
                        subtitle={`Ticket: ${selectedTicket.reference} • Status: ${selectedTicket.status.toUpperCase()}`}
                    />
                ) : (
                    <PageHeader
                        title="Help & Support"
                        subtitle="Manage your support tickets and get assistance from our team."
                        customAction={
                            <button className={sharedStyles.btnPrimary} onClick={() => setIsModalOpen(true)}>
                                + New Ticket
                            </button>
                        }
                    />
                )}
            </div>

            <div className={sharedStyles.pageCard}>
                {selectedTicket ? (
                    // --- Chat View ---
                    <div className={styles.chatContainer}>
                        <div className={styles.messagesList} style={{ paddingTop: '8px' }}>
                            {isMessagesLoading ? (
                                <div className={sharedStyles.loadingContainer}>Loading messages...</div>
                            ) : messages.length === 0 ? (
                                <div className={sharedStyles.emptyState}>
                                    <p>No messages yet. We'll respond shortly.</p>
                                </div>
                            ) : (
                                messages.map(msg => {
                                    const isUser = msg.sender_id === userId;
                                    return (
                                        <div key={msg.id} className={`${styles.messageBubble} ${isUser ? styles.messageUser : styles.messageAdmin}`}>
                                            <div>{msg.message}</div>
                                            <span className={styles.messageTime}>
                                                {isUser ? 'You' : 'Support Team'} &bull; {formatDate(msg.created_at)}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {selectedTicket.status !== 'resolved' && (
                            <div className={styles.choiceChipsContainer}>
                                {["Thank you!", "I still need help.", "Can you provide more details?", "This issue is resolved."].map((reply, i) => (
                                    <button 
                                        key={i} 
                                        type="button"
                                        className={styles.choiceChip}
                                        onClick={() => setNewMessageContent(reply)}
                                    >
                                        {reply}
                                    </button>
                                ))}
                            </div>
                        )}

                        <form className={styles.chatInputArea} onSubmit={handleSendMessage}>
                            <textarea 
                                className={sharedStyles.input} 
                                style={{ flex: 1, minHeight: '44px', maxHeight: '120px', resize: 'vertical' }}
                                placeholder={selectedTicket.status === 'resolved' ? "Ticket resolved. You cannot reply." : "Type your message here..."}
                                value={newMessageContent}
                                onChange={e => setNewMessageContent(e.target.value)}
                                disabled={selectedTicket.status === 'resolved'}
                            />
                            <button 
                                type="submit" 
                                className={styles.sendBtn} 
                                disabled={isSendingMessage || !newMessageContent.trim() || selectedTicket.status === 'resolved'}
                            >
                                Send
                            </button>
                        </form>
                    </div>
                ) : (
                    // --- List View ---
                    <>
                        {isLoading ? (
                            <div className={sharedStyles.loadingContainer}>Loading tickets...</div>
                        ) : tickets.length === 0 ? (
                            <div className={sharedStyles.emptyState}>
                                <h3>No Support Tickets</h3>
                                <p>You haven't opened any support requests yet.</p>
                                <button className={sharedStyles.btnSecondary} style={{ margin: '0 auto' }} onClick={() => setIsModalOpen(true)}>
                                    Create a Ticket
                                </button>
                            </div>
                        ) : (
                            <div className={styles.grid}>
                                {tickets.map(ticket => (
                                    <div key={ticket.id} className={styles.ticketCard} onClick={() => handleTicketClick(ticket)}>
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
                    </>
                )}
            </div>

            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2 className={styles.modalTitle}>Create Support Ticket</h2>
                        <form className={sharedStyles.form} onSubmit={handleCreateTicket}>
                            <div className={sharedStyles.inputGroup}>
                                <label className={sharedStyles.label}>Subject</label>
                                <input 
                                    required
                                    className={sharedStyles.input} 
                                    placeholder="Brief summary of your issue"
                                    value={newTicket.subject}
                                    onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                                />
                            </div>
                            <div className={sharedStyles.inputGroup}>
                                <label className={sharedStyles.label}>Priority</label>
                                <select 
                                    className={sharedStyles.select}
                                    value={newTicket.priority}
                                    onChange={e => setNewTicket({...newTicket, priority: e.target.value as any})}
                                >
                                    <option value="low">Low - General Question</option>
                                    <option value="normal">Normal - Issue / Bug</option>
                                    <option value="high">High - Blocking my work</option>
                                    <option value="urgent">Urgent - Platform outage / Security</option>
                                </select>
                            </div>
                            <div className={sharedStyles.inputGroup}>
                                <label className={sharedStyles.label}>Message</label>
                                <textarea 
                                    required
                                    className={sharedStyles.textarea} 
                                    placeholder="Please describe your issue in detail..."
                                    value={newTicket.message}
                                    onChange={e => setNewTicket({...newTicket, message: e.target.value})}
                                />
                            </div>
                            <div className={styles.btnRow}>
                                <button type="button" className={sharedStyles.btnGhost} onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className={sharedStyles.btnPrimary} disabled={isSubmitting}>
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
