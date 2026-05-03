"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatDate } from '@/utils/format';
import SubPageHeader from '@/components/shared/SubPageHeader';
import Badge from '@/components/shared/Badge';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import type { BadgeVariant } from '@/types/shared';
import { useConfirmModal } from '@/hooks/useConfirmModal';

interface WaitlistEntry {
    id: string;
    event_id: string;
    user_id: string;
    ticket_tier_id: string | null;
    status: string;
    position: number;
    invited_at: string | null;
    expires_at: string | null;
    created_at: string;
    user_profile: { full_name: string; user_name: string; email: string | null } | null;
    ticket_tier: { name: string } | null;
}

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'Waiting', variant: 'warning' },
    invited: { label: 'Invited', variant: 'info' },
    joined: { label: 'Joined', variant: 'success' },
    expired: { label: 'Expired', variant: 'neutral' },
};

export default function EventWaitlistPage() {
    const { id: eventId } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [eventTitle, setEventTitle] = useState('');
    const [entries, setEntries] = useState<WaitlistEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const fetchData = useCallback(async () => {
        if (!eventId || !activeAccount) return;
        setIsLoading(true);
        try {
            const [eventRes, waitlistRes] = await Promise.all([
                supabase
                    .from('events')
                    .select('title')
                    .eq('id', eventId)
                    .eq('account_id', activeAccount.id)
                    .single(),
                supabase
                    .from('event_waitlists')
                    .select('*, user_profile:user_id(full_name, user_name, email), ticket_tier:ticket_tier_id(name)')
                    .eq('event_id', eventId)
                    .order('position', { ascending: true }),
            ]);

            if (eventRes.data) setEventTitle(eventRes.data.title);
            if (waitlistRes.error) throw waitlistRes.error;

            setEntries(waitlistRes.data || []);
        } catch (e: unknown) {
            showToast('Failed to load waitlist', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, activeAccount, supabase, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleInvite = async (entryId: string) => {
        try {
            const { error } = await supabase
                .from('event_waitlists')
                .update({
                    status: 'invited',
                    invited_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h
                })
                .eq('id', entryId)
                .eq('status', 'pending');

            if (error) throw error;
            showToast('Invitation sent', 'success');
            fetchData();
        } catch (e: unknown) {
            showToast(getErrorMessage(e) || 'Failed to send invitation', 'error');
        }
    };

    const handleInviteAll = async () => {
        const pendingEntries = entries.filter(e => e.status === 'pending');
        if (pendingEntries.length === 0) {
            showToast('No pending entries to invite', 'error');
            return;
        }
        if (!await confirm(`Invite all ${pendingEntries.length} pending attendees?`)) return;

        try {
            const now = new Date().toISOString();
            const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

            const { error } = await supabase
                .from('event_waitlists')
                .update({
                    status: 'invited',
                    invited_at: now,
                    expires_at: expires,
                })
                .eq('event_id', eventId)
                .eq('status', 'pending');

            if (error) throw error;
            showToast(`${pendingEntries.length} invitations sent`, 'success');
            fetchData();
        } catch (e: unknown) {
            showToast('Failed to invite all', 'error');
        }
    };

    const handleRemove = async (entryId: string) => {
        if (!await confirm('Remove this person from the waitlist?')) return;
        try {
            const { error } = await supabase
                .from('event_waitlists')
                .delete()
                .eq('id', entryId);
            if (error) throw error;
            showToast('Entry removed', 'success');
            fetchData();
        } catch (e: unknown) {
            showToast('Failed to remove entry', 'error');
        }
    };

    const filtered = filterStatus === 'all'
        ? entries
        : entries.filter(e => e.status === filterStatus);

    const pendingCount = entries.filter(e => e.status === 'pending').length;

    return (
        <div className={adminStyles.page}>
            {ConfirmDialog}
            <SubPageHeader
                title="Waitlist"
                subtitle={eventTitle
                    ? `${entries.length} total, ${pendingCount} pending for "${eventTitle}"`
                    : 'Manage event waitlist'}
                backHref={`/dashboard/organize/events/${eventId}`}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['all', 'pending', 'invited', 'joined', 'expired'].map(s => (
                        <button
                            key={s}
                            className={filterStatus === s ? adminStyles.primaryButton : adminStyles.secondaryButton}
                            onClick={() => setFilterStatus(s)}
                            style={{ fontSize: 13, padding: '6px 14px', textTransform: 'capitalize' }}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                {pendingCount > 0 && (
                    <button className={adminStyles.primaryButton} onClick={handleInviteAll}>
                        Invite All Pending ({pendingCount})
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className={adminStyles.loadingContainer}><div className={adminStyles.spinner} /></div>
            ) : filtered.length === 0 ? (
                <div className={adminStyles.emptyState}>
                    <p>{filterStatus === 'all' ? 'No one on the waitlist yet.' : `No ${filterStatus} entries.`}</p>
                </div>
            ) : (
                <table className={adminStyles.table}>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Attendee</th>
                            <th>Ticket Tier</th>
                            <th>Joined</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(entry => {
                            const badge = STATUS_MAP[entry.status] || { label: entry.status, variant: 'neutral' as BadgeVariant };
                            return (
                                <tr key={entry.id}>
                                    <td>{entry.position}</td>
                                    <td>
                                        <div>
                                            <span style={{ fontWeight: 500 }}>
                                                {entry.user_profile?.full_name || `@${entry.user_profile?.user_name || entry.user_id.slice(0, 8)}`}
                                            </span>
                                            {entry.user_profile?.email && (
                                                <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                                                    {entry.user_profile.email}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{entry.ticket_tier?.name || 'General'}</td>
                                    <td>{formatDate(entry.created_at)}</td>
                                    <td><Badge variant={badge.variant} label={badge.label} /></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {entry.status === 'pending' && (
                                                <button
                                                    className={adminStyles.primaryButton}
                                                    onClick={() => handleInvite(entry.id)}
                                                    style={{ fontSize: 12, padding: '4px 10px' }}
                                                >
                                                    Invite
                                                </button>
                                            )}
                                            {(entry.status === 'pending' || entry.status === 'expired') && (
                                                <button
                                                    className={adminStyles.dangerButton}
                                                    onClick={() => handleRemove(entry.id)}
                                                    style={{ fontSize: 12, padding: '4px 10px' }}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
