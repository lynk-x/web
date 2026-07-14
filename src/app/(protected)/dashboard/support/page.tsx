"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import EmptyStateGuide from '@/components/dashboard/EmptyStateGuide';
import Badge from '@/components/shared/Badge';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import Textarea from '@/components/shared/Textarea';
import Select from '@/components/shared/Select';
import { createClient } from '@/utils/supabase/client';
import { createSupportRepository } from '@/lib/repositories';
import { useToast } from '@/components/ui/Toast';
import type { SupportTicket, SupportTicketMessage } from '@/lib/repositories/support.repository';

export default function SupportDashboard() {
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
            // reports.trigger_support_ticket_created already inserts the ticket's
            // `message` as the first row in support_ticket_messages — no need to
            // add it again here.
            showToast('Support ticket created successfully!', 'success');
            setTickets([data, ...tickets]);
            setIsModalOpen(false);
            setNewTicket({ subject: '', message: '', priority: 'normal' });
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
            <div style={{ marginBottom: '24px' }}>
                {selectedTicket ? (
                    <PageHeader
                        title={selectedTicket.subject}
                        subtitle={`Ticket: ${selectedTicket.reference} • Status: ${selectedTicket.status.toUpperCase()}`}
                        onClose={() => setSelectedTicket(null)}
                    />
                ) : (
                    <PageHeader
                        title="Help & Support"
                        subtitle="Manage your support tickets and get assistance from our team."
                        primaryAction={{ label: '+ New Ticket', onClick: () => setIsModalOpen(true) }}
                        closeHref="/dashboard"
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

                        {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
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
                                placeholder={selectedTicket.status === 'resolved' || selectedTicket.status === 'closed' ? "Ticket closed. You cannot reply." : "Type your message here..."}
                                value={newMessageContent}
                                onChange={e => setNewMessageContent(e.target.value)}
                                disabled={selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}
                            />
                            <button
                                type="submit"
                                className={styles.sendBtn}
                                disabled={isSendingMessage || !newMessageContent.trim() || selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}
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
                            <EmptyStateGuide 
                                title="No Support Tickets"
                                description="You haven't opened any support requests yet."
                                actionLabel="Create a Ticket"
                                actionOnClick={() => setIsModalOpen(true)}
                            />
                        ) : (
                            <div className={styles.grid}>
                                {tickets.map(ticket => (
                                    <div 
                                        key={ticket.id} 
                                        className={styles.ticketCard} 
                                        onClick={() => handleTicketClick(ticket)}
                                        style={{ 
                                            borderLeft: `4px solid ${
                                                ticket.priority === 'urgent' ? '#F44336' : 
                                                ticket.priority === 'high' ? '#FF9800' : 
                                                ticket.priority === 'normal' ? '#2196F3' : '#708090'
                                            }`
                                        }}
                                    >
                                        <div className={styles.ticketHeader}>
                                            <div className={styles.ticketHeaderLeft}>
                                                <span className={styles.ticketRef}>{ticket.reference}</span>
                                                <h3 className={styles.ticketTitle}>{ticket.subject}</h3>
                                            </div>
                                            <Badge
                                                label={ticket.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                variant={ticket.status === 'resolved' ? 'success' : ticket.status === 'open' || ticket.status === 'waiting_on_user' ? 'warning' : ticket.status === 'new' ? 'primary' : 'neutral'}
                                            />
                                        </div>
                                        
                                        <p className={styles.ticketPreview}>
                                            {ticket.message.length > 120 ? ticket.message.slice(0, 120) + '...' : ticket.message}
                                        </p>
                                        
                                        <div className={styles.ticketMeta}>
                                            <div className={styles.metaItem}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                                </svg>
                                                <span>{formatDate(ticket.created_at)}</span>
                                            </div>
                                            <div className={styles.metaItem}>
                                                <svg className={styles['priorityIcon_' + ticket.priority]} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                                </svg>
                                                <span className={styles['priority_' + ticket.priority]}>
                                                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
                                                </span>
                                            </div>
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
                            <Input 
                                required
                                label="Subject"
                                placeholder="Brief summary of your issue"
                                value={newTicket.subject}
                                onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                            />
                            <Select
                                label="Priority"
                                value={newTicket.priority}
                                onChange={e => setNewTicket({...newTicket, priority: e.target.value as any})}
                                options={[
                                    { value: 'low', label: 'Low - General Question' },
                                    { value: 'normal', label: 'Normal - Issue / Bug' },
                                    { value: 'high', label: 'High - Blocking my work' },
                                    { value: 'urgent', label: 'Urgent - Platform outage / Security' }
                                ]}
                            />
                            <Textarea 
                                required
                                label="Message"
                                placeholder="Please describe your issue in detail..."
                                value={newTicket.message}
                                onChange={e => setNewTicket({...newTicket, message: e.target.value})}
                                style={{ minHeight: '100px' }}
                            />
                            <div className={styles.btnRow}>
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" variant="primary" disabled={isSubmitting} isLoading={isSubmitting}>
                                    Submit Ticket
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
