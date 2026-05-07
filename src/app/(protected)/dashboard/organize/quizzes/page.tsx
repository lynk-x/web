"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatDate } from '@/utils/format';
import Badge from '@/components/shared/Badge';
import BulkActionsBar from '@/components/shared/BulkActionsBar';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import type { BadgeVariant } from '@/types/shared';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import PageHeader from '@/components/dashboard/PageHeader';
import ProductTour from '@/components/dashboard/ProductTour';

interface Quiz {
    id: string;
    title: string;
    status: 'draft' | 'published' | 'closed';
    forum_channel_id: string | null;
    forum_id: string;
    created_at: string;
    event_title?: string;
    forum_channels?: { display_name: string } | null;
}

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
    draft:     { label: 'Draft',  variant: 'neutral' },
    published: { label: 'Live',   variant: 'success' },
    closed:    { label: 'Closed', variant: 'warning' },
};

export default function QuizzesPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { enabled: isQuizEnabled, isLoading: isFlagLoading } = useFeatureFlag('enable_live_quiz');

    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchQuizzes = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            // 1. Get all events for this account with their forum IDs
            const { data: events, error: evErr } = await supabase
                .from('events')
                .select('id, title, forums(id)')
                .eq('account_id', activeAccount.id);
            if (evErr) throw evErr;

            // 2. Build forum_id → event title map
            const forumTitleMap: Record<string, string> = {};
            const forumIds: string[] = [];
            (events || []).forEach((evt: any) => {
                const forums = Array.isArray(evt.forums) ? evt.forums : (evt.forums ? [evt.forums] : []);
                forums.forEach((f: any) => {
                    forumTitleMap[f.id] = evt.title;
                    forumIds.push(f.id);
                });
            });

            if (forumIds.length === 0) {
                setQuizzes([]);
                return;
            }

            // 3. Get questionnaires for those forums
            const { data, error } = await supabase
                .from('questionnaires')
                .select('id, title, status, forum_channel_id, forum_id, created_at, forum_channels(display_name)')
                .in('forum_id', forumIds)
                .eq('type', 'quiz')
                .order('created_at', { ascending: false });
            if (error) throw error;

            setQuizzes((data || []).map((q: any) => ({
                ...q,
                event_title: forumTitleMap[q.forum_id] || '—',
                forum_channels: Array.isArray(q.forum_channels) ? q.forum_channels[0] : q.forum_channels
            })));
            setSelectedIds(new Set());
        } catch (e: unknown) {
            showToast(getErrorMessage(e) || 'Failed to load quizzes', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast]);

    useEffect(() => {
        if (!isOrgLoading && activeAccount) {
            fetchQuizzes();
        } else if (!isOrgLoading) {
            setIsLoading(false);
        }
    }, [isOrgLoading, activeAccount, fetchQuizzes]);

    const handleSelect = (id: string) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === quizzes.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(quizzes.map(q => q.id)));
    };

    const handleDuplicate = async (id: string) => {
        showToast('Cloning quiz...', 'info');
        try {
            const { data, error } = await supabase.rpc('duplicate_quiz', { p_quiz_id: id });
            if (error) throw error;
            showToast('Quiz duplicated to draft.', 'success');
            fetchQuizzes();
        } catch (e: unknown) {
            showToast(getErrorMessage(e) || 'Duplication failed', 'error');
        }
    };

    const handleBulkAction = async (action: 'publish' | 'delete' | 'duplicate') => {
        if (selectedIds.size === 0) return;
        
        if (action === 'delete') {
            if (!await confirm(`Are you sure you want to delete ${selectedIds.size} quizzes?`)) return;
        }

        setIsLoading(true);
        try {
            const { data, error } = action === 'publish'
                ? await supabase.rpc('bulk_update_quiz_status', { p_quiz_ids: Array.from(selectedIds), p_status: 'published' })
                : action === 'duplicate'
                    ? await supabase.rpc('bulk_duplicate_quizzes', { p_quiz_ids: Array.from(selectedIds) })
                    : await supabase.rpc('bulk_delete_quizzes', { p_quiz_ids: Array.from(selectedIds) });

            if (error) throw error;
            showToast(`Bulk action complete: ${data.processed_count} quizzes processed.`, 'success');
            fetchQuizzes();
        } catch (e: unknown) {
            showToast(getErrorMessage(e) || 'Bulk action failed', 'error');
            setIsLoading(false);
        }
    };

    const handleDelete = async (quiz: Quiz) => {
        if (quiz.status !== 'draft') {
            showToast('Only draft quizzes can be deleted', 'error');
            return;
        }
        if (!await confirm(`Delete quiz "${quiz.title}"? This cannot be undone.`)) return;
        try {
            const { error } = await supabase.from('questionnaires').delete().eq('id', quiz.id);
            if (error) throw error;
            showToast('Quiz deleted', 'success');
            fetchQuizzes();
        } catch (e: unknown) {
            showToast(getErrorMessage(e) || 'Failed to delete quiz', 'error');
        }
    };

    if (!isFlagLoading && isQuizEnabled === false) {
        return (
            <div className={adminStyles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px' }}>Live quizzes are not available yet.</p>
            </div>
        );
    }

    return (
        <div className={adminStyles.page}>
            {ConfirmDialog}
            <PageHeader
                title="Quizzes"
                subtitle="Manage live quizzes for your event forums."
                actionLabel="+ Create Quiz"
                onActionClick={() => router.push('/dashboard/organize/quizzes/new')}
                actionClassName="tour-create-quiz"
            />

            <div className="tour-bulk-actions">
                <BulkActionsBar
                    selectedCount={selectedIds.size}
                    onCancel={() => setSelectedIds(new Set())}
                    actions={[
                        { label: 'Duplicate Selected', onClick: () => handleBulkAction('duplicate'), variant: 'default' },
                        { label: 'Publish Selected', onClick: () => handleBulkAction('publish'), variant: 'default' },
                        { label: 'Delete Selected', onClick: () => handleBulkAction('delete'), variant: 'danger' }
                    ]}
                />
            </div>

            {isLoading ? (
                <div className={adminStyles.loadingContainer}><div className={adminStyles.spinner} /></div>
            ) : (
                <table className={adminStyles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: 40 }}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size > 0 && selectedIds.size === quizzes.length}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th>Title</th>
                            <th>Event</th>
                            <th>Channel</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {quizzes.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '48px', opacity: 0.5 }}>
                                    No quizzes found.
                                </td>
                            </tr>
                        ) : (
                            quizzes.map(quiz => {
                                const badge = STATUS_MAP[quiz.status] ?? { label: quiz.status, variant: 'neutral' as BadgeVariant };
                                return (
                                    <tr key={quiz.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(quiz.id)}
                                                onChange={() => handleSelect(quiz.id)}
                                            />
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{quiz.title}</td>
                                        <td style={{ color: 'var(--color-text-secondary)' }}>{quiz.event_title}</td>
                                        <td>
                                            {quiz.forum_channels?.display_name ? (
                                                <span style={{
                                                    background: 'rgba(255,255,255,0.06)',
                                                    padding: '2px 8px',
                                                    borderRadius: 6,
                                                    fontSize: 13,
                                                    fontWeight: 600
                                                }}>
                                                    #{quiz.forum_channels.display_name}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td><Badge variant={badge.variant} label={badge.label} /></td>
                                        <td style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                                            {formatDate(quiz.created_at)}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <Link
                                                    href={`/dashboard/organize/quizzes/${quiz.id}/host`}
                                                    className={adminStyles.btnPrimary}
                                                    style={{ fontSize: 13, padding: '4px 12px', textDecoration: 'none' }}
                                                >
                                                    Host Live
                                                </Link>
                                                <button
                                                    className={adminStyles.btnSecondary}
                                                    onClick={() => handleDuplicate(quiz.id)}
                                                    style={{ fontSize: 13, padding: '4px 12px' }}
                                                >
                                                    Duplicate
                                                </button>
                                                <Link
                                                    href={`/dashboard/organize/quizzes/${quiz.id}/edit`}
                                                    className={adminStyles.btnSecondary}
                                                    style={{ fontSize: 13, padding: '4px 12px', textDecoration: 'none' }}
                                                >
                                                    Edit
                                                </Link>
                                                <Link
                                                    href={`/dashboard/organize/quizzes/${quiz.id}/results`}
                                                    className={adminStyles.btnSecondary}
                                                    style={{ fontSize: 13, padding: '4px 12px', textDecoration: 'none' }}
                                                >
                                                    Results
                                                </Link>
                                                {quiz.status === 'draft' && (
                                                    <button
                                                        className={adminStyles.btnDanger}
                                                        onClick={() => handleDelete(quiz)}
                                                        style={{ fontSize: 13, padding: '4px 10px' }}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            )}

            <ProductTour
                storageKey={activeAccount ? `hasSeenOrgQuizzesJoyride_${activeAccount.id}` : 'hasSeenOrgQuizzesJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Interactive Quizzes',
                        content: 'Quizzes are a powerful way to engage your audience during live events. You can create multiple-choice challenges and host them in real-time.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-create-quiz',
                        title: 'Build a Quiz',
                        content: 'Start by creating a new quiz. You can add questions, set correct answers and link it to specific event forum channels.',
                    },
                    {
                        target: `.${adminStyles.table}`,
                        title: 'Quiz Management',
                        content: 'Monitor all your quizzes here. You can see which event and channel they belong to, as well as their current status.',
                    },
                    {
                        target: 'a[href*="/host"]',
                        title: 'Go Live!',
                        content: 'When your event starts, click "Host Live" to launch the interactive presenter view and start accepting attendee responses.',
                    }
                ]}
            />
        </div>
    );
}
