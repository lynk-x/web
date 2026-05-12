"use client";
import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { ActionItem } from '@/components/shared/TableRowActions';

interface SupportTicket {
    id: string;
    reference: string;
    submitter: string | null;
    email: string;
    subject: string;
    message: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'new' | 'investigating' | 'resolved' | 'dismissed';
    created_at: string;
}

const statusVariant: Record<string, any> = {
    new: 'warning',
    investigating: 'info',
    resolved: 'success',
    dismissed: 'neutral',
};

const priorityVariant: Record<string, any> = {
    low: 'neutral',
    normal: 'info',
    high: 'warning',
    urgent: 'error',
};

interface SupportTicketsTabProps {
    searchQuery?: string;
    statusFilter?: string;
}

export default function SupportTicketsTab({
    searchQuery = '',
    statusFilter = 'all'
}: SupportTicketsTabProps) {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [items, setItems] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 15;

    const fetchTickets = useCallback(async () => {
        setIsLoading(true);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const { data, error } = await supabase.rpc('get_admin_support_data', {
                p_tab: 'tickets',
                p_params: {
                    search: searchQuery,
                    status: statusFilter,
                    limit: itemsPerPage,
                    offset: offset
                }
            });

            if (error) throw error;

            setTotalCount(data.total || 0);
            setItems((data.items || []).map((t: any) => ({
                id: t.id,
                reference: t.reference,
                submitter: t.full_name || t.submitter_username || null,
                email: t.email,
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
    }, [supabase, showToast, currentPage, statusFilter, searchQuery]);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);
    useEffect(() => { setCurrentPage(1); }, [statusFilter, searchQuery]);

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase.rpc('admin_update_support_status', {
                p_tab: 'feedback', // RPC uses 'feedback' case for tickets too
                p_id: id,
                p_status: newStatus
            });
            if (error) throw error;
            setItems(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
            showToast(`Ticket marked as ${newStatus}`, 'success');
            fetchTickets();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
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
                    <div style={{ fontSize: '11px', opacity: 0.5 }}>{t.email}</div>
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
            render: (t) => <Badge label={t.status.charAt(0).toUpperCase() + t.status.slice(1)} variant={statusVariant[t.status]} showDot />,
        },
    ];

    const getActions = (t: SupportTicket): ActionItem[] => [
        { label: 'Investigate', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>, onClick: () => handleStatusChange(t.id, 'investigating') },
        { label: 'Resolve', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>, onClick: () => handleStatusChange(t.id, 'resolved') },
        { label: 'Dismiss', variant: 'danger', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>, onClick: () => handleStatusChange(t.id, 'dismissed') },
    ];

    return (
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
    );
}
