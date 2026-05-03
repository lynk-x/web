"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatDate, formatTime } from '@/utils/format';
import SubPageHeader from '@/components/shared/SubPageHeader';
import Modal from '@/components/shared/Modal';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import { useConfirmModal } from '@/hooks/useConfirmModal';

interface EventSession {
    id: string;
    event_id: string;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string;
    location: any;
    order_index: number;
    created_at: string;
}

export default function EventSessionsPage() {
    const { id: eventId } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [sessions, setSessions] = useState<EventSession[]>([]);
    const [eventTitle, setEventTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<EventSession | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [venue, setVenue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchSessions = useCallback(async () => {
        if (!eventId || !activeAccount) return;
        setIsLoading(true);
        try {
            const { data: eventData } = await supabase
                .from('events')
                .select('title')
                .eq('id', eventId)
                .eq('account_id', activeAccount.id)
                .single();

            if (eventData) setEventTitle(eventData.title);

            const { data, error } = await supabase
                .from('event_sessions')
                .select('*')
                .eq('event_id', eventId)
                .order('order_index', { ascending: true });

            if (error) throw error;
            setSessions(data || []);
        } catch (e: unknown) {
            showToast('Failed to load sessions', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, activeAccount, supabase, showToast]);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    const openCreate = () => {
        setEditingSession(null);
        setTitle('');
        setDescription('');
        setStartsAt('');
        setEndsAt('');
        setVenue('');
        setIsModalOpen(true);
    };

    const openEdit = (session: EventSession) => {
        setEditingSession(session);
        setTitle(session.title);
        setDescription(session.description || '');
        setStartsAt(session.starts_at ? session.starts_at.slice(0, 16) : '');
        setEndsAt(session.ends_at ? session.ends_at.slice(0, 16) : '');
        setVenue(session.location?.venue || '');
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!title.trim() || !startsAt || !endsAt) {
            showToast('Title, start, and end times are required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                event_id: eventId,
                title: title.trim(),
                description: description.trim() || null,
                starts_at: new Date(startsAt).toISOString(),
                ends_at: new Date(endsAt).toISOString(),
                location: venue.trim() ? { venue: venue.trim() } : null,
                order_index: editingSession?.order_index ?? sessions.length,
            };

            if (editingSession) {
                const { error } = await supabase
                    .from('event_sessions')
                    .update(payload)
                    .eq('id', editingSession.id);
                if (error) throw error;
                showToast('Session updated', 'success');
            } else {
                const { error } = await supabase
                    .from('event_sessions')
                    .insert(payload);
                if (error) throw error;
                showToast('Session created', 'success');
            }

            setIsModalOpen(false);
            fetchSessions();
        } catch (e: unknown) {
            showToast(getErrorMessage(e) || 'Failed to save session', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (sessionId: string) => {
        if (!await confirm('Delete this session?')) return;
        try {
            const { error } = await supabase
                .from('event_sessions')
                .delete()
                .eq('id', sessionId);
            if (error) throw error;
            showToast('Session deleted', 'success');
            fetchSessions();
        } catch (e: unknown) {
            showToast('Failed to delete session', 'error');
        }
    };

    return (
        <div className={adminStyles.page}>
            {ConfirmDialog}
            <SubPageHeader
                title="Sessions"
                subtitle={eventTitle ? `Manage sessions for "${eventTitle}"` : 'Manage event sessions'}
                backHref={`/dashboard/organize/events/${eventId}`}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className={adminStyles.primaryButton} onClick={openCreate}>
                    + Add Session
                </button>
            </div>

            {isLoading ? (
                <div className={adminStyles.loadingContainer}>
                    <div className={adminStyles.spinner} />
                </div>
            ) : sessions.length === 0 ? (
                <div className={adminStyles.emptyState}>
                    <p>No sessions yet. Add sessions for multi-day or multi-stage events.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {sessions.map((session, i) => (
                        <div key={session.id} className={adminStyles.card} style={{ padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                                        {session.title}
                                    </h3>
                                    {session.description && (
                                        <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
                                            {session.description}
                                        </p>
                                    )}
                                    <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                                        {formatDate(session.starts_at)} {formatTime(session.starts_at)} — {formatTime(session.ends_at)}
                                        {session.location?.venue && ` · ${session.location.venue}`}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        className={adminStyles.secondaryButton}
                                        onClick={() => openEdit(session)}
                                        style={{ fontSize: 13, padding: '6px 12px' }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className={adminStyles.dangerButton}
                                        onClick={() => handleDelete(session.id)}
                                        style={{ fontSize: 13, padding: '6px 12px' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingSession ? 'Edit Session' : 'Add Session'}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <label className={adminStyles.fieldLabel}>
                            Title *
                            <input
                                className={adminStyles.input}
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. Day 1 - Opening Ceremony"
                            />
                        </label>
                        <label className={adminStyles.fieldLabel}>
                            Description
                            <textarea
                                className={adminStyles.textarea}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={3}
                                placeholder="Optional session description"
                            />
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label className={adminStyles.fieldLabel}>
                                Start *
                                <input
                                    className={adminStyles.input}
                                    type="datetime-local"
                                    value={startsAt}
                                    onChange={e => setStartsAt(e.target.value)}
                                />
                            </label>
                            <label className={adminStyles.fieldLabel}>
                                End *
                                <input
                                    className={adminStyles.input}
                                    type="datetime-local"
                                    value={endsAt}
                                    onChange={e => setEndsAt(e.target.value)}
                                />
                            </label>
                        </div>
                        <label className={adminStyles.fieldLabel}>
                            Venue / Stage
                            <input
                                className={adminStyles.input}
                                value={venue}
                                onChange={e => setVenue(e.target.value)}
                                placeholder="e.g. Main Stage, Room B"
                            />
                        </label>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                            <button className={adminStyles.secondaryButton} onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </button>
                            <button className={adminStyles.primaryButton} onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : editingSession ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
