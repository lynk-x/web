"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/app/dashboard/admin/page.module.css';
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

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Support tab for `app_feedback`.
 * Lets admins triage user-submitted bug reports and ratings.
 */
export default function AppFeedbackTab() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [items, setItems] = useState<AppFeedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchFeedback = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('app_feedback')
                .select('*, submitter:profiles!user_id(full_name, user_name)')
                .order('created_at', { ascending: false });
            if (error) throw error;
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
    }, [supabase, showToast]);

    useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

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

    // Unique categories derived from data
    const categories = Array.from(new Set(items.map(f => f.category))).sort();

    const filtered = items.filter(f => {
        const matchSearch = f.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (f.submitter ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'all' || f.status === statusFilter;
        const matchCategory = categoryFilter === 'all' || f.category === categoryFilter;
        return matchSearch && matchStatus && matchCategory;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        { label: 'Dismiss', variant: 'danger' as any, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>, onClick: () => handleStatusChange(f.id, 'dismissed') },
    ];

    return (
        <div>
            <TableToolbar searchPlaceholder="Search feedback..." searchValue={searchTerm} onSearchChange={setSearchTerm}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['all', 'new', 'reviewed', 'resolved', 'dismissed'].map(s => (
                        <button key={s} className={`${adminStyles.chip} ${statusFilter === s ? adminStyles.chipActive : ''}`} onClick={() => { setStatusFilter(s); setCurrentPage(1); }}>
                            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
                {categories.length > 0 && (
                    <select
                        value={categoryFilter}
                        onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20,20,20,0.8)', color: 'white', fontSize: '13px' }}
                    >
                        <option value="all">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                )}
            </TableToolbar>

            <DataTable<AppFeedback>
                data={paginated}
                columns={columns}
                getActions={getActions}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                emptyMessage="No feedback submissions found."
            />
        </div>
    );
}
