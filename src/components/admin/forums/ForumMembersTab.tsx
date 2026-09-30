"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';
import { formatRelativeTime } from '@/utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Mirrors api.v1_forum_members (forum_members joined with public profile info). */
interface ForumMember {
    forum_id: string;
    user_id: string;
    user_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
    is_premium: boolean;
    role_id: string;
    is_muted: boolean;
    has_muted_live_chats_media: boolean;
    joined_at: string;
    last_read_at: string | null;
}

const roleVariant: Record<string, BadgeVariant> = {
    owner: 'primary',
    organizer: 'primary',
    moderator: 'info',
    member: 'neutral',
};

/**
 * Members tab for admin forum management.
 * Reads api.v1_forum_members (forum_members joined with profile info), scoped
 * to a single forum when forumId is given, otherwise platform-wide.
 * Lets admins change a member's role or remove them from the forum.
 */
export default function ForumMembersTab({ forumId }: { forumId?: string }) {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [members, setMembers] = useState<ForumMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const fetchMembers = useCallback(async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .schema('api')
                .from('v1_forum_members')
                .select('*')
                .order('joined_at', { ascending: false });

            if (forumId) {
                query = query.eq('forum_id', forumId);
            }

            const { data, error } = await query.limit(500);
            if (error) throw error;
            setMembers((data || []) as ForumMember[]);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load forum members', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, forumId]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    // Writes go through the plain public.forum_members passthrough (RLS-gated,
    // admin-writable) rather than api.v1_forum_members, which is a read-only
    // joined view with no INSTEAD OF rules.
    const handleRemove = async (member: ForumMember) => {
        try {
            const { error } = await supabase
                .from('forum_members')
                .delete()
                .eq('forum_id', member.forum_id)
                .eq('user_id', member.user_id);
            if (error) throw error;
            setMembers(prev => prev.filter(m => !(m.forum_id === member.forum_id && m.user_id === member.user_id)));
            showToast('Member removed from forum', 'success');
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleToggleMute = async (member: ForumMember) => {
        try {
            const { error } = await supabase
                .from('forum_members')
                .update({ is_muted: !member.is_muted })
                .eq('forum_id', member.forum_id)
                .eq('user_id', member.user_id);
            if (error) throw error;
            setMembers(prev => prev.map(m =>
                m.forum_id === member.forum_id && m.user_id === member.user_id
                    ? { ...m, is_muted: !member.is_muted }
                    : m
            ));
            showToast(member.is_muted ? 'Member unmuted' : 'Member muted', 'success');
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const filtered = members.filter(m => {
        const matchSearch =
            (m.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.user_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchRole = roleFilter === 'all' || m.role_id === roleFilter;
        return matchSearch && matchRole;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const columns: Column<ForumMember & { id: string }>[] = [
        {
            header: 'Member',
            render: (m) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {m.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-interface-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, opacity: 0.6 }}>
                            {(m.full_name || m.user_name || '?').charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{m.full_name || 'Deleted User'}</div>
                        {m.user_name && <div style={{ fontSize: '11px', opacity: 0.5 }}>@{m.user_name}</div>}
                    </div>
                    {m.is_premium && <Badge label="Premium" variant="warning" />}
                </div>
            ),
        },
        {
            header: 'Role',
            render: (m) => <Badge label={m.role_id} variant={roleVariant[m.role_id] ?? 'neutral'} />,
        },
        {
            header: 'Status',
            render: (m) => (
                <div style={{ display: 'flex', gap: 6 }}>
                    {m.is_muted && <Badge label="Muted" variant="error" />}
                    {m.has_muted_live_chats_media && <Badge label="Live Muted" variant="neutral" />}
                    {!m.is_muted && !m.has_muted_live_chats_media && <span style={{ fontSize: 12, opacity: 0.5 }}>—</span>}
                </div>
            ),
        },
        {
            header: 'Joined',
            render: (m) => <div style={{ fontSize: '12px', opacity: 0.6 }}>{formatRelativeTime(m.joined_at)}</div>,
        },
        {
            header: 'Last Active',
            render: (m) => (
                <div style={{ fontSize: '12px', opacity: 0.6 }}>
                    {m.last_read_at ? formatRelativeTime(m.last_read_at) : 'Never'}
                </div>
            ),
        },
    ];

    const getActions = (m: ForumMember) => [
        {
            label: m.is_muted ? 'Unmute' : 'Mute',
            onClick: () => handleToggleMute(m),
        },
        {
            label: 'Remove from Forum',
            variant: 'danger' as const,
            onClick: () => handleRemove(m),
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <TableToolbar searchPlaceholder="Search by name or username..." searchValue={searchTerm} onSearchChange={v => { setSearchTerm(v); setCurrentPage(1); }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['all', 'member', 'moderator', 'organizer', 'owner'].map(r => (
                        <button key={r} className={`${adminStyles.chip} ${roleFilter === r ? adminStyles.chipActive : ''}`} onClick={() => { setRoleFilter(r); setCurrentPage(1); }}>
                            {r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}
                        </button>
                    ))}
                </div>
            </TableToolbar>

            <DataTable<ForumMember & { id: string }>
                data={paginated.map(m => ({ ...m, id: `${m.forum_id}-${m.user_id}` }))}
                columns={columns}
                getActions={getActions}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                emptyMessage="No forum members found."
            />
        </div>
    );
}
