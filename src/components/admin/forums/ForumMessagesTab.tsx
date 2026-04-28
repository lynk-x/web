"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';
import { formatRelativeTime } from '@/utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Mirrors `forum_messages` joined with author profile and forum event title. */
interface ForumMessage {
    id: string;
    forum_id: string;
    /** Event title from forums → events join */
    event_title: string;
    author_name: string;
    author_username: string;
    message_type: string;
    sub_channel: string;
    content: string;
    is_pinned: boolean;
    is_hidden: boolean;
    edit_count: number;
    created_at: string;
}

const typeVariant: Record<string, any> = {
    chat: 'neutral',
    announcement: 'info',
    poll: 'warning',
    media: 'success',
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Forums tab for admin message moderation.
 * Reads `forum_messages` joined through forums → events for context.
 * Allows admins to hide/unhide and unpin individual messages.
 */
export default function ForumMessagesTab() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [messages, setMessages] = useState<ForumMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [visFilter, setVisFilter] = useState('all'); // all | hidden | visible
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const fetchMessages = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('forum_messages')
                .select(`
                    id, forum_id, message_type, content, is_pinned, is_hidden, edit_count, created_at,
                    author:user_profile!author_id(full_name, user_name),
                    channel:forum_channels(slug),
                    forum:forums!forum_id(event:events!event_id(title))
                `)
                .order('created_at', { ascending: false })
                .limit(500);
            if (error) throw error;
            setMessages((data || []).map((m: any) => ({
                id: m.id,
                forum_id: m.forum_id,
                event_title: m.forum?.event?.title ?? 'Unknown Event',
                author_name: m.author?.full_name || 'Deleted User',
                author_username: m.author?.user_name || '',
                message_type: m.message_type,
                sub_channel: m.channel?.slug || "general",
                content: m.content,
                is_pinned: m.is_pinned,
                is_hidden: m.is_hidden,
                edit_count: m.edit_count,
                created_at: m.created_at,
            })));
        } catch (err: any) {
            showToast(err.message || 'Failed to load messages', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => { fetchMessages(); }, [fetchMessages]);

    const handleToggleHide = async (msg: ForumMessage) => {
        try {
            const { error } = await supabase
                .from('forum_messages')
                .update({ is_hidden: !msg.is_hidden, updated_at: new Date().toISOString() })
                .eq('id', msg.id);
            if (error) throw error;
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_hidden: !msg.is_hidden } : m));
            showToast(`Message ${!msg.is_hidden ? 'hidden' : 'made visible'}`, 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleUnpin = async (msg: ForumMessage) => {
        try {
            const { error } = await supabase
                .from('forum_messages')
                .update({ is_pinned: false, updated_at: new Date().toISOString() })
                .eq('id', msg.id);
            if (error) throw error;
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_pinned: false } : m));
            showToast('Message unpinned.', 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const filtered = messages.filter(m => {
        const matchSearch =
            m.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.author_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.event_title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchType = typeFilter === 'all' || m.message_type === typeFilter;
        const matchVis =
            visFilter === 'all' ||
            (visFilter === 'hidden' && m.is_hidden) ||
            (visFilter === 'visible' && !m.is_hidden);
        return matchSearch && matchType && matchVis;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const columns: Column<ForumMessage>[] = [{
        header: 'Author',
        render: (m) => (
            <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{m.author_name}</div>
                {m.author_username && <div style={{ fontSize: '11px', opacity: 0.5 }}>@{m.author_username}</div>}
                <div style={{ fontSize: '11px', opacity: 0.4, marginTop: '2px' }}>{m.event_title}</div>
            </div>
        ),
    },
    {
        header: 'Channel',
        render: (m) => (
            <Badge
                label={m.sub_channel === 'general' ? 'Global' : m.sub_channel.toUpperCase()}
                variant={m.sub_channel === 'general' ? 'neutral' : 'info'}
                showDot={m.sub_channel !== 'general'}
            />
        ),
    },
    {
        header: 'Type',
        render: (m) => <Badge label={m.message_type} variant={typeVariant[m.message_type] ?? 'neutral'} />,
    },
    {
        header: 'Message',
        render: (m) => (
            <div style={{ fontSize: '13px', lineHeight: 1.5, maxWidth: '320px' }}>
                {m.is_hidden && <span style={{ color: '#ff4d4d', fontSize: '11px', fontWeight: 600, marginRight: '6px' }}>HIDDEN</span>}
                {m.is_pinned && <span style={{ color: 'var(--color-brand-primary)', fontSize: '11px', fontWeight: 600, marginRight: '6px' }}>📌 PINNED</span>}
                <span style={{ opacity: m.is_hidden ? 0.4 : 0.85 }}>
                    {m.content.length > 120 ? m.content.slice(0, 120) + '…' : m.content}
                </span>
                {m.edit_count > 0 && <span style={{ fontSize: '10px', opacity: 0.4, marginLeft: '6px' }}>(edited {m.edit_count}×)</span>}
            </div>
        ),
    },
    {
        header: 'Posted',
        render: (m) => <div style={{ fontSize: '12px', opacity: 0.6 }}>{formatRelativeTime(m.created_at)}</div>,
    },
    ];

    const getActions = (m: ForumMessage) => [
        {
            label: m.is_hidden ? 'Make Visible' : 'Hide Message',
            variant: (m.is_hidden ? 'success' : 'danger') as 'success' | 'danger',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
            onClick: () => handleToggleHide(m),
        },
        ...(m.is_pinned ? [{
            label: 'Unpin',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
            onClick: () => handleUnpin(m),
        }] : []),
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <TableToolbar searchPlaceholder="Search by content, author, or event..." searchValue={searchTerm} onSearchChange={v => { setSearchTerm(v); setCurrentPage(1); }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['all', 'chat', 'announcement', 'poll', 'media'].map(t => (
                        <button key={t} className={`${adminStyles.chip} ${typeFilter === t ? adminStyles.chipActive : ''}`} onClick={() => { setTypeFilter(t); setCurrentPage(1); }}>
                            {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {[{ value: 'all', label: 'All' }, { value: 'visible', label: 'Visible' }, { value: 'hidden', label: 'Hidden' }].map(({ value, label }) => (
                        <button key={value} className={`${adminStyles.chip} ${visFilter === value ? adminStyles.chipActive : ''}`} onClick={() => { setVisFilter(value); setCurrentPage(1); }}>
                            {label}
                        </button>
                    ))}
                </div>
            </TableToolbar>

            <DataTable<ForumMessage>
                data={paginated}
                columns={columns}
                getActions={getActions}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                emptyMessage="No messages found."
            />
        </div>
    );
}
