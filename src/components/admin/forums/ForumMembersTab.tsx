"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import TableToolbar from '@/components/shared/TableToolbar';
import Modal from '@/components/shared/Modal';
import Button from '@/components/shared/Button';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import { formatRelativeTime } from '@/utils/format';
import styles from './ForumMembersTab.module.css';

const ASSIGNABLE_ROLES = ['member', 'organizer'];

import { ForumMember } from '@/lib/repositories/forum.repository';

interface MemberSummary {
    user_id: string;
    full_name: string | null;
    user_name: string | null;
    avatar_url: string | null;
    is_premium: boolean;
    forums: number;
    organizer_count: number;
    member_count: number;
    messages: number;
    media: number;
    first_joined: string;
    last_active: string | null;
}

export default function ForumMembersTab({ forumId, startDate = '', endDate = '' }: { forumId?: string, startDate?: string, endDate?: string }) {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [members, setMembers] = useState<ForumMember[]>([]);
    const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
    const [mediaCounts, setMediaCounts] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewUser, setViewUser] = useState<MemberSummary | null>(null);
    const [roleModalMember, setRoleModalMember] = useState<ForumMember | null>(null);
    const [pendingRole, setPendingRole] = useState('member');
    const [isSavingRole, setIsSavingRole] = useState(false);
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

            const { data, error } = await query.limit(1000);
            if (error) throw error;
            const rows = (data || []) as ForumMember[];
            setMembers(rows);

            // Aggregate message/media counts per user (best-effort).
            const userIds = Array.from(new Set(rows.map(m => m.user_id)));
            if (userIds.length > 0) {
                try {
                    const { data: msgData } = await supabase
                        .schema('social')
                        .from('forum_messages')
                        .select('author_id')
                        .in('author_id', userIds);
                    const mc: Record<string, number> = {};
                    (msgData || []).forEach((r: { author_id: string }) => { mc[r.author_id] = (mc[r.author_id] || 0) + 1; });
                    setMessageCounts(mc);
                } catch { /* ignore */ }
                try {
                    const { data: mediaData } = await supabase
                        .schema('social')
                        .from('forum_media')
                        .select('uploader_id')
                        .in('uploader_id', userIds);
                    const mdc: Record<string, number> = {};
                    (mediaData || []).forEach((r: { uploader_id: string }) => { mdc[r.uploader_id] = (mdc[r.uploader_id] || 0) + 1; });
                    setMediaCounts(mdc);
                } catch { /* ignore */ }
            }
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load forum members', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, forumId]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    useEffect(() => { setCurrentPage(1); }, [startDate, endDate, searchTerm]);

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

    const openRoleModal = (member: ForumMember) => {
        setPendingRole(member.role_id);
        setRoleModalMember(member);
    };

    const handleChangeRole = async () => {
        if (!roleModalMember) return;
        setIsSavingRole(true);
        try {
            const { error } = await supabase
                .from('forum_members')
                .update({ role_id: pendingRole })
                .eq('forum_id', roleModalMember.forum_id)
                .eq('user_id', roleModalMember.user_id);
            if (error) throw error;
            setMembers(prev => prev.map(m =>
                m.forum_id === roleModalMember.forum_id && m.user_id === roleModalMember.user_id
                    ? { ...m, role_id: pendingRole }
                    : m
            ));
            showToast('Member role updated', 'success');
            setRoleModalMember(null);
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setIsSavingRole(false);
        }
    };

    const summary: MemberSummary[] = useMemo(() => {
        const map = new Map<string, MemberSummary & { forumSet: Set<string>; joinedDates: string[]; lastRead: string | null }>();
        members.forEach(m => {
            if (!map.has(m.user_id)) {
                map.set(m.user_id, {
                    user_id: m.user_id,
                    full_name: m.full_name,
                    user_name: m.user_name,
                    avatar_url: m.avatar_url,
                    is_premium: m.is_premium,
                    forums: 0,
                    organizer_count: 0,
                    member_count: 0,
                    messages: messageCounts[m.user_id] || 0,
                    media: mediaCounts[m.user_id] || 0,
                    first_joined: m.joined_at,
                    last_active: m.last_read_at,
                    forumSet: new Set(),
                    joinedDates: [],
                    lastRead: m.last_read_at,
                });
            }
            const u = map.get(m.user_id)!;
            u.forumSet.add(m.forum_id);
            if (m.role_id === 'organizer') u.organizer_count++; else u.member_count++;
            u.joinedDates.push(m.joined_at);
            if (!u.first_joined || new Date(m.joined_at) < new Date(u.first_joined)) u.first_joined = m.joined_at;
            if (m.last_read_at && (!u.lastRead || new Date(m.last_read_at) > new Date(u.lastRead))) u.lastRead = m.last_read_at;
        });
        return Array.from(map.values()).map(u => ({
            user_id: u.user_id,
            full_name: u.full_name,
            user_name: u.user_name,
            avatar_url: u.avatar_url,
            is_premium: u.is_premium,
            forums: u.forumSet.size,
            organizer_count: u.organizer_count,
            member_count: u.member_count,
            messages: u.messages,
            media: u.media,
            first_joined: u.first_joined,
            last_active: u.lastRead,
        })).filter(u => {
            const matchSearch = (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.user_name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchStart = !startDate || new Date(u.first_joined).getTime() >= new Date(startDate).getTime();
            const matchEnd = !endDate || new Date(u.first_joined).getTime() <= new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
            return matchSearch && matchStart && matchEnd;
        });
    }, [members, messageCounts, mediaCounts, searchTerm, startDate, endDate]);

    const totalPages = Math.ceil(summary.length / itemsPerPage);
    const paginated = summary.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const columns: Column<MemberSummary & { id: string }>[] = [
        {
            header: 'Member',
            render: (m) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {m.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatar_url} alt={m.full_name || m.user_name || 'Member avatar'} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-interface-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, opacity: 0.6 }}>
                            {(m.full_name || m.user_name || '?').charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{m.full_name || 'Deleted User'}</div>
                        {m.user_name && <div style={{ fontSize: '11px', opacity: 0.5 }}>@{m.user_name}</div>}
                    </div>
                </div>
            ),
        },
        {
            header: 'Role Ratio (Org/Member)',
            render: (m) => <span style={{ fontSize: '12px' }}>{m.organizer_count}/{m.member_count}</span>,
        },
        {
            header: 'Forums',
            render: (m) => <span style={{ fontSize: '12px' }}>{m.forums}</span>,
        },
        {
            header: 'Messages',
            render: (m) => <span style={{ fontSize: '12px' }}>{m.messages}</span>,
        },
        {
            header: 'Media',
            render: (m) => <span style={{ fontSize: '12px' }}>{m.media}</span>,
        },
        {
            header: 'First Joined',
            render: (m) => <div style={{ fontSize: '12px', opacity: 0.6 }}>{formatRelativeTime(m.first_joined)}</div>,
        },
        {
            header: 'Last Active',
            render: (m) => <div style={{ fontSize: '12px', opacity: 0.6 }}>{m.last_active ? formatRelativeTime(m.last_active) : 'Never'}</div>,
        },
    ];

    const getActions = (m: MemberSummary) => [
        {
            label: 'View Forums',
            onClick: () => setViewUser(m),
        },
    ];

    const viewMembers = members.filter(m => m.user_id === viewUser?.user_id);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <TableToolbar searchPlaceholder="Search by name or username..." searchValue={searchTerm} onSearchChange={v => { setSearchTerm(v); setCurrentPage(1); }} />

            <DataTable<MemberSummary & { id: string }>
                data={paginated.map(m => ({ ...m, id: m.user_id }))}
                columns={columns}
                getActions={getActions}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                emptyMessage="No forum members found."
            />

            <Modal
                isOpen={!!viewUser}
                onClose={() => setViewUser(null)}
                title={`Forums: ${viewUser?.full_name || viewUser?.user_name || 'Member'}`}
                size="large"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {viewMembers.map(m => (
                        <div key={`${m.forum_id}-${m.user_id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                            <span style={{ fontSize: 13 }}>{m.forum_id}</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <Button variant="secondary" onClick={() => handleToggleMute(m)}>{m.is_muted ? 'Unmute' : 'Mute'}</Button>
                                <Button variant="secondary" onClick={() => openRoleModal(m)}>Change Role</Button>
                                <Button variant="danger" onClick={() => handleRemove(m)}>Remove</Button>
                            </div>
                        </div>
                    ))}
                    {viewMembers.length === 0 && <div style={{ opacity: 0.6 }}>No forums.</div>}
                </div>
            </Modal>

            <Modal
                isOpen={!!roleModalMember}
                onClose={() => setRoleModalMember(null)}
                title={`Change Role: ${roleModalMember?.full_name || roleModalMember?.user_name || 'Member'}`}
                size="small"
                footer={
                    <div className={styles.modalFooter}>
                        <Button variant="secondary" onClick={() => setRoleModalMember(null)}>Cancel</Button>
                        <Button variant="primary" isLoading={isSavingRole} onClick={handleChangeRole}>Save</Button>
                    </div>
                }
            >
                <select
                    className={styles.roleSelect}
                    value={pendingRole}
                    onChange={e => setPendingRole(e.target.value)}
                >
                    {ASSIGNABLE_ROLES.map(r => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                </select>
            </Modal>
        </div>
    );
}
