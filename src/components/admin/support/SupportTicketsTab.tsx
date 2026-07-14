"use client";
import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import Modal from '@/components/shared/Modal';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import type { ActionItem } from '@/components/shared/TableRowActions';

interface SupportTicket {
    id: string;
    reference: string;
    user_id: string | null;
    submitter: string | null;
    email: string;
    phone: string | null;
    subject: string;
    message: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'new' | 'open' | 'waiting_on_user' | 'resolved' | 'closed';
    created_at: string;
}

interface SupportTicketMessage {
    id: string;
    ticket_id: string;
    sender_id: string | null;
    message: string;
    is_read: boolean;
    created_at: string;
}

const statusVariant: Record<string, any> = {
    new: 'warning',
    open: 'info',
    waiting_on_user: 'info',
    resolved: 'success',
    closed: 'neutral',
};

const priorityVariant: Record<string, any> = {
    low: 'neutral',
    normal: 'info',
    high: 'warning',
    urgent: 'error',
};

const formatStatusLabel = (status: string) =>
    status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

interface SupportTicketsTabProps {
    searchQuery?: string;
    statusFilter?: string;
    startDate?: string;
    endDate?: string;
}

export default function SupportTicketsTab({
    searchQuery = '',
    statusFilter = 'all',
    startDate = '',
    endDate = '',
}: SupportTicketsTabProps) {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [items, setItems] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 15;

    // ─── Ticket Thread Modal ────────────────────────────────────────────
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);

    const fetchTickets = useCallback(async () => {
        setIsLoading(true);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const { data, error } = await supabase.schema('api').rpc('get_admin_support_data', {
                p_tab: 'tickets',
                p_params: {
                    search: searchQuery,
                    status: statusFilter,
                    limit: itemsPerPage,
                    offset: offset
                }
            });

            if (error) throw error;

            let raw = data.items || [];
            if (startDate || endDate) {
                const startTs = startDate ? new Date(startDate).getTime() : 0;
                const endTs   = endDate   ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
                raw = raw.filter((t: SupportTicket) => {
                    const ts = new Date(t.created_at).getTime();
                    return ts >= startTs && ts <= endTs;
                });
            }
            setTotalCount(data.total || 0);
            setItems((raw || []).map((t: any) => ({
                id: t.id,
                reference: t.reference,
                user_id: t.user_id ?? null,
                submitter: t.full_name || t.submitter_username || null,
                email: t.email,
                phone: t.phone ?? null,
                subject: t.subject,
                message: t.message,
                priority: t.priority,
                status: t.status,
                created_at: t.created_at,
            })));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load tickets', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, currentPage, statusFilter, searchQuery, startDate, endDate]);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);
    useEffect(() => { setCurrentPage(1); }, [statusFilter, searchQuery, startDate, endDate]);

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase.schema('api').rpc('admin_update_support_status', {
                p_tab: 'tickets',
                p_id: id,
                p_status: newStatus
            });
            if (error) throw error;
            setItems(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as SupportTicket['status'] } : t));
            if (selectedTicket?.id === id) setSelectedTicket(prev => prev ? { ...prev, status: newStatus as SupportTicket['status'] } : prev);
            showToast(`Ticket marked as ${newStatus}`, 'success');
            fetchTickets();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const openTicket = async (t: SupportTicket) => {
        setSelectedTicket(t);
        setIsMessagesLoading(true);
        try {
            const { data, error } = await supabase
                .schema('api')
                .from('v1_support_ticket_messages')
                .select('*')
                .eq('ticket_id', t.id)
                .order('created_at', { ascending: true });
            if (error) throw error;
            setMessages(data || []);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load ticket messages', 'error');
        } finally {
            setIsMessagesLoading(false);
        }
    };

    const closeModal = () => {
        setSelectedTicket(null);
        setMessages([]);
        setReplyText('');
    };

    const handleSendReply = async () => {
        if (!selectedTicket || !replyText.trim()) return;
        setIsSendingReply(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('admin_reply_to_ticket', {
                p_ticket_id: selectedTicket.id,
                p_message: replyText.trim()
            });
            if (error) throw error;
            setMessages(prev => [...prev, data as SupportTicketMessage]);
            setReplyText('');
            // Agent reply auto-transitions new/open -> waiting_on_user (see
            // trigger_support_ticket_message_inserted) — reflect it locally.
            setSelectedTicket(prev => prev && (prev.status === 'new' || prev.status === 'open')
                ? { ...prev, status: 'waiting_on_user' } : prev);
            setItems(prev => prev.map(t => t.id === selectedTicket.id && (t.status === 'new' || t.status === 'open')
                ? { ...t, status: 'waiting_on_user' } : t));
            showToast('Reply sent', 'success');
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to send reply', 'error');
        } finally {
            setIsSendingReply(false);
        }
    };

    const columns: Column<SupportTicket>[] = [
        {
            header: 'Ticket',
            render: (t) => (
                <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{t.reference}</div>
                    <div style={{ fontSize: '11px', opacity: 0.5 }}>{new Date(t.created_at).toLocaleDateString()}</div>
                </div>
            ),
        },
        {
            header: 'Submitter',
            render: (t) => (
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{t.submitter ?? 'Guest'}</div>
                    <div style={{ fontSize: '11px', opacity: 0.5 }}>{t.phone || t.email}</div>
                </div>
            ),
        },
        {
            header: 'Subject & Message',
            render: (t) => (
                <div style={{ maxWidth: '400px' }}>
                    <div style={{ fontWeight: 500, fontSize: '13px', marginBottom: '4px' }}>{t.subject}</div>
                    <div style={{ fontSize: '12px', opacity: 0.7, lineBreak: 'anywhere' }}>
                        {t.message.length > 100 ? t.message.slice(0, 100) + '...' : t.message}
                    </div>
                </div>
            ),
        },
        {
            header: 'Priority',
            render: (t) => <Badge label={t.priority.toUpperCase()} variant={priorityVariant[t.priority]} />,
        },
        {
            header: 'Status',
            render: (t) => <Badge label={formatStatusLabel(t.status)} variant={statusVariant[t.status]} showDot />,
        },
    ];

    const getActions = (t: SupportTicket): ActionItem[] => [
        {
            label: 'View & Reply',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
            onClick: () => openTicket(t),
        },
        { label: 'Investigate', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>, onClick: () => handleStatusChange(t.id, 'open') },
        { label: 'Resolve', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>, onClick: () => handleStatusChange(t.id, 'resolved') },
        { label: 'Close', variant: 'danger', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>, onClick: () => handleStatusChange(t.id, 'closed') },
    ];

    const isTicketClosed = selectedTicket?.status === 'resolved' || selectedTicket?.status === 'closed';

    return (
        <>
            <DataTable<SupportTicket>
                data={items}
                columns={columns}
                getActions={getActions}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={Math.ceil(totalCount / itemsPerPage)}
                onPageChange={setCurrentPage}
                emptyMessage="No support tickets found."
            />

            <Modal
                isOpen={!!selectedTicket}
                onClose={closeModal}
                title={selectedTicket ? `${selectedTicket.reference} — ${selectedTicket.subject}` : ''}
                size="large"
                footer={selectedTicket && (
                    <>
                        <button className={adminStyles.btnSecondary} onClick={() => handleStatusChange(selectedTicket.id, 'resolved')}>
                            Mark Resolved
                        </button>
                        <button className={adminStyles.btnSecondary} onClick={() => handleStatusChange(selectedTicket.id, 'closed')}>
                            Close Ticket
                        </button>
                    </>
                )}
            >
                {selectedTicket && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '13px', opacity: 0.7 }}>
                                {selectedTicket.submitter ?? 'Guest'} &bull; {selectedTicket.phone || selectedTicket.email}
                            </div>
                            <Badge label={formatStatusLabel(selectedTicket.status)} variant={statusVariant[selectedTicket.status]} showDot />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', padding: '4px' }}>
                            {isMessagesLoading ? (
                                <div style={{ opacity: 0.5, fontSize: '13px', padding: '24px', textAlign: 'center' }}>Loading messages...</div>
                            ) : messages.length === 0 ? (
                                <div style={{ opacity: 0.5, fontSize: '13px', padding: '24px', textAlign: 'center' }}>No messages yet.</div>
                            ) : (
                                messages.map(msg => {
                                    const isSystem = msg.sender_id === null;
                                    const isRequester = !isSystem && msg.sender_id === selectedTicket.user_id;
                                    const isAgent = !isSystem && !isRequester;
                                    const align: 'center' | 'flex-end' | 'flex-start' = isSystem ? 'center' : isAgent ? 'flex-end' : 'flex-start';
                                    return (
                                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: align }}>
                                            <div style={{
                                                maxWidth: '75%',
                                                padding: '10px 14px',
                                                borderRadius: '10px',
                                                fontSize: '13px',
                                                background: isSystem ? 'rgba(255,255,255,0.04)' : align === 'flex-end' ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.06)',
                                                color: align === 'flex-end' && !isSystem ? '#000' : 'inherit',
                                            }}>
                                                {msg.message}
                                            </div>
                                            <span style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>
                                                {isSystem ? 'System' : isRequester ? 'Requester' : 'Support Team'} &bull; {new Date(msg.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                            <textarea
                                className={adminStyles.input}
                                style={{ flex: 1, minHeight: '44px', maxHeight: '120px', resize: 'vertical' }}
                                placeholder={isTicketClosed ? 'Ticket closed. Reopen via Investigate to reply.' : 'Type a reply...'}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                disabled={isTicketClosed}
                            />
                            <button
                                className={adminStyles.btnPrimary}
                                onClick={handleSendReply}
                                disabled={isSendingReply || !replyText.trim() || isTicketClosed}
                            >
                                {isSendingReply ? 'Sending...' : 'Send'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}
