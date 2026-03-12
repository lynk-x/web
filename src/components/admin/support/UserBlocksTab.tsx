"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Mirrors `user_blocks` joined with blocker and blocked profiles.
 * Composite PK becomes a derived `id` string for DataTable.
 */
interface UserBlock {
    /** `${blocker_id}:${blocked_id}` */
    id: string;
    blocker_id: string;
    blocker_name: string;
    blocker_username: string;
    blocked_id: string;
    blocked_name: string;
    blocked_username: string;
    created_at: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UserBlocksTabProps {
    searchQuery?: string;
}

/**
 * Support tab for `user_blocks`.
 * Admin read-only view of who has blocked whom — useful for moderation investigation.
 * Admins can remove a block if it's being used to evade moderation restrictions.
 */
export default function UserBlocksTab({ searchQuery = '' }: UserBlocksTabProps) {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [blocks, setBlocks] = useState<UserBlock[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const fetchBlocks = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_blocks')
                .select(`
                    *,
                    blocker:user_profile!blocker_id(full_name, user_name),
                    blocked:user_profile!blocked_id(full_name, user_name)
                `)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setBlocks((data || []).map((b: any) => ({
                id: `${b.blocker_id}:${b.blocked_id}`,
                blocker_id: b.blocker_id,
                blocker_name: b.blocker?.full_name || 'Unknown',
                blocker_username: b.blocker?.user_name || '',
                blocked_id: b.blocked_id,
                blocked_name: b.blocked?.full_name || 'Unknown',
                blocked_username: b.blocked?.user_name || '',
                created_at: b.created_at,
            })));
        } catch (err: any) {
            showToast(err.message || 'Failed to load user blocks', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

    /** Removes a block — only for admin moderation use (e.g. confirmed block-evasion). */
    const handleRemoveBlock = async (block: UserBlock) => {
        if (!confirm(`Remove block: ${block.blocker_name} → ${block.blocked_name}?`)) return;
        try {
            const { error } = await supabase
                .from('user_blocks')
                .delete()
                .eq('blocker_id', block.blocker_id)
                .eq('blocked_id', block.blocked_id);
            if (error) throw error;
            setBlocks(prev => prev.filter(b => b.id !== block.id));
            showToast('Block removed.', 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const filtered = blocks.filter(b => {
        const q = searchQuery.toLowerCase();
        return b.blocker_name.toLowerCase().includes(q) ||
            b.blocker_username.toLowerCase().includes(q) ||
            b.blocked_name.toLowerCase().includes(q) ||
            b.blocked_username.toLowerCase().includes(q);
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const ProfileCell = ({ name, username }: { name: string; username: string }) => (
        <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>{name}</div>
            {username && <div style={{ fontSize: '11px', opacity: 0.5 }}>@{username}</div>}
        </div>
    );

    const columns: Column<UserBlock>[] = [
        { header: 'Blocker', render: (b) => <ProfileCell name={b.blocker_name} username={b.blocker_username} /> },
        {
            header: '',
            render: () => (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,77,77,0.7)" strokeWidth="2"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
            ),
        },
        { header: 'Blocked User', render: (b) => <ProfileCell name={b.blocked_name} username={b.blocked_username} /> },
        {
            header: 'Blocked Since',
            render: (b) => <div style={{ fontSize: '12px', opacity: 0.6 }}>{new Date(b.created_at).toLocaleDateString()}</div>,
        },
    ];

    const getActions = (b: UserBlock) => [
        {
            label: 'Remove Block', variant: 'danger' as const,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
            onClick: () => handleRemoveBlock(b),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', opacity: 0.6, lineHeight: 1.6 }}>
                    Read-only view of active user blocks. Admins can remove a block if it is being used to evade moderation restrictions.
                </div>
            </div>

            <DataTable<UserBlock>
                data={paginated}
                columns={columns}
                getActions={getActions}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                emptyMessage="No user blocks found."
            />
        </div>
    );
}
