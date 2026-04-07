"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import adminStyles from '@/app/dashboard/admin/page.module.css';
import FilterGroup from '@/components/dashboard/FilterGroup';
import { createClient } from '@/utils/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Mirrors `app_feedback` joined with `profiles!user_id(full_name, user_name)`. */
interface AppFeedback {
    id: string;
    /** submitter's full_name or user_name; null if anonymous / deleted */
    submitter: string | null;
    category: string;
    /** 1–5 star rating */
    rating: number | null;
    content: string;
    app_version: string | null;
    /** enum: new | reviewed | resolved | dismissed */
    status: string;
    admin_notes: string | null;
    created_at: string;
}

const ratingStars = (r: number | null) => {
    if (!r) return <span style={{ opacity: 0.4 }}>—</span>;
    const stars = '★'.repeat(r) + '☆'.repeat(5 - r);
    const color = r >= 4 ? 'var(--color-brand-primary)' : r === 3 ? '#f5a623' : '#ff4d4d';
    return <span style={{ color, fontFamily: 'monospace', fontSize: '14px', letterSpacing: '2px' }}>{stars}</span>;
};

const statusVariant: Record<string, any> = {
    new: 'warning',
    reviewed: 'info',
    resolved: 'success',
    dismissed: 'neutral',
};

interface AppFeedbackTabProps {
    searchQuery?: string;
    statusFilter?: string;
    categoryFilter?: string;
}

/**
 * Support tab for `app_feedback`.
 * Lets admins triage user-submitted bug reports and ratings.
 */
export default function AppFeedbackTab({
    searchQuery = '',
    statusFilter = 'all',
    categoryFilter = 'all'
}: AppFeedbackTabProps) {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [items, setItems] = useState<AppFeedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 15;

    const fetchFeedback = useCallback(async () => {
        setIsLoading(true);
        try {
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            let query = supabase
                .from('app_feedback')
                .select('*, submitter:user_profile!user_id(full_name, user_name)', { count: 'exact' });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            if (categoryFilter !== 'all') {
                query = query.eq('category', categoryFilter);
            }

            if (searchQuery) {
                query = query.ilike('content', `%${searchQuery}%`);
            }

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            setTotalCount(count || 0);
            setItems((data || []).map((f: any) => ({
                id: f.id,
                submitter: f.submitter?.full_name || f.submitter?.user_name || null,
                category: f.category,
                rating: f.rating,
                content: f.content,
                app_version: f.app_version,
                status: f.status,
                admin_notes: f.admin_notes,
                created_at: f.created_at,
            })));
        } catch (err: any) {
            showToast(err.message || 'Failed to load feedback', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, currentPage, statusFilter, categoryFilter, searchQuery]);

    useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

    useEffect(() => { setCurrentPage(1); }, [statusFilter, categoryFilter, searchQuery]);

    /** Update feedback status (e.g. mark as reviewed, resolve, dismiss). */
    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase.from('app_feedback').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
            setItems(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
            showToast(`Feedback marked as ${newStatus}`, 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const columns: Column<AppFeedback>[] = [
        {
            header: 'Submission',
            render: (f) => (
                <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{f.submitter ?? <span style={{ opacity: 0.4 }}>Anonymous</span>}</div>
                    <div style={{ fontSize: '12px', opacity: 0.5 }}>{f.category} {f.app_version ? `· v${f.app_version}` : ''}</div>
                </div>
            ),
        },
        {
            header: 'Rating',
            render: (f) => ratingStars(f.rating),
        },
        {
            header: 'Feedback',
            render: (f) => (
                <div style={{ fontSize: '13px', maxWidth: '340px', lineHeight: 1.5, opacity: 0.85 }}>
                    {f.content.length > 140 ? f.content.slice(0, 140) + '…' : f.content}
                </div>
            ),
        },
        {
            header: 'Status',
            render: (f) => <Badge label={f.status.charAt(0).toUpperCase() + f.status.slice(1)} variant={statusVariant[f.status] ?? 'neutral'} showDot />,
        },
        {
            header: 'Date',
            render: (f) => <div style={{ fontSize: '12px', opacity: 0.6 }}>{new Date(f.created_at).toLocaleDateString()}</div>,
        },
    ];

    const getActions = (f: AppFeedback) => [
        { label: 'Mark Reviewed', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>, onClick: () => handleStatusChange(f.id, 'reviewed') },
        { label: 'Mark Resolved', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>, onClick: () => handleStatusChange(f.id, 'resolved') },
        { label: 'Dismiss', variant: 'danger' as const, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>, onClick: () => handleStatusChange(f.id, 'dismissed') },
    ];

    return (
        <DataTable<AppFeedback>
            data={items}
            columns={columns}
            getActions={getActions}
            isLoading={isLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            emptyMessage="No feedback submissions found."
        />
    );
}
