"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import ForumTable, { ForumThread } from '@/components/admin/forums/ForumTable';
import ForumMessagesTab from '@/components/admin/forums/ForumMessagesTab';
import ForumMediaTab from '@/components/admin/forums/ForumMediaTab';
import Link from 'next/link';
import Tabs from '@/components/dashboard/Tabs';
import PageHeader from '@/components/dashboard/PageHeader';

/**
 * Mock forums — aligned to `forum_status` schema enum.
 * Note: the exact casing of the enum is preserved (Open, Read_only, Archived).
 * When wiring up: `supabase.from('forums').select('*, event:events!event_id(title)')`
 */
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import { exportToCSV } from '@/utils/export';
import { createClient } from '@/utils/supabase/client';
import { formatRelativeTime } from '@/utils/format';
import StatCard from '@/components/dashboard/StatCard';
import { useConfirmModal } from '@/hooks/useConfirmModal';

function ForumsContent() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const initialTab = (searchParams.get('tab') as string) || 'forums';
    const [activeTab, setActiveTab] = useState<'forums' | 'messages' | 'media'>(
        ['forums', 'messages', 'media'].includes(initialTab) ? initialTab as 'forums' | 'messages' | 'media' : 'forums'
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as string;
        if (tab && ['forums', 'messages', 'media'].includes(tab)) {
            setActiveTab(tab as typeof activeTab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as Extract<typeof activeTab, string>);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };
    const [threads, setThreads] = useState<ForumThread[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [platformStats, setPlatformStats] = useState({ total: 0, open: 0, readOnly: 0, escalations: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Fetch platform-wide stats once (unaffected by filters/pagination)
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await supabase
                    .schema('analytics')
                    .from('mv_forum_performance')
                    .select('status, escalated_reports_count');
                if (data) {
                    setPlatformStats({
                        total: data.length,
                        open: data.filter((f: any) => f.status === 'open').length,
                        readOnly: data.filter((f: any) => f.status === 'read_only').length,
                        escalations: data.reduce((acc: number, f: any) => acc + (parseInt(f.escalated_reports_count) || 0), 0),
                    });
                }
            } catch { /* non-critical */ }
        };
        fetchStats();
    }, [supabase]);

    useEffect(() => {
        const fetchForums = async () => {
            setIsLoading(true);
            try {
                const from = (currentPage - 1) * itemsPerPage;
                const to = from + itemsPerPage - 1;

                let query = supabase
                    .schema('analytics')
                    .from('mv_forum_performance')
                    .select('*', { count: 'exact' })
                    .order('last_activity_at', { ascending: false })
                    .range(from, to);

                if (searchTerm) query = query.ilike('event_title', `%${searchTerm}%`);
                if (statusFilter !== 'all') query = query.eq('status', statusFilter);

                const { data, error, count } = await query;

                if (error) throw error;

                const mappedThreads: ForumThread[] = (data || []).map((f: any) => ({
                    id: f.id,
                    reference: f.reference,
                    title: f.event_title + ' Forum',
                    eventName: f.event_title,
                    eventId: f.event_id,
                    status: f.status,
                    announcementsCount: parseInt(f.announcements_count) || 0,
                    liveChatsCount: parseInt(f.live_chats_count) || 0,
                    mediaCount: parseInt(f.media_count) || 0,
                    reportsCount: parseInt(f.reports_count) || 0,
                    escalatedCount: parseInt(f.escalated_reports_count) || 0,
                    oldestReportAt: f.oldest_report_at,
                    lastActivity: formatRelativeTime(f.last_activity_at),
                }));

                setThreads(mappedThreads);
                setTotalCount(count ?? 0);
            } catch (err) {
                showToast('Failed to load forum management data.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchForums();
    }, [supabase, showToast, currentPage, itemsPerPage, searchTerm, statusFilter]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const paginatedThreads = threads;

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedThreadIds(new Set());
    }, [searchTerm, statusFilter]);

    // Selection Logic
    const handleSelectThread = (id: string) => {
        const newSelected = new Set(selectedThreadIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedThreadIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedThreadIds.size === paginatedThreads.length) {
            setSelectedThreadIds(new Set());
        } else {
            const newSelected = new Set(selectedThreadIds);
            paginatedThreads.forEach(thread => newSelected.add(thread.id));
            setSelectedThreadIds(newSelected);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        const count = selectedThreadIds.size;
        showToast(`Updating ${count} forums to ${newStatus}...`, 'info');

        try {
            const { error } = await supabase.rpc('bulk_update_forum_status', {
                forum_ids: Array.from(selectedThreadIds),
                new_status: newStatus
            });

            if (error) throw error;

            showToast(`Successfully moved ${count} forums to ${newStatus}.`, 'success');

            // Refresh local state to avoid full re-fetch
            setThreads(prev => prev.map(t =>
                selectedThreadIds.has(t.id) ? { ...t, status: newStatus as ForumThread['status'] } : t
            ));
            setSelectedThreadIds(new Set());
        } catch (err) {
            showToast('Failed to update forum status.', 'error');
        }
    };

    const handleBulkDelete = async () => {
        if (!await confirm(`Are you sure? This will delete ${selectedThreadIds.size} forums. This action cannot be undone.`)) return;

        showToast(`Deleting ${selectedThreadIds.size} forums...`, 'info');
        try {
            // Soft-delete by archiving: hard-deleting forums via client bypasses RLS.
            // Archive is the admin-safe equivalent of deletion.
            const { error } = await supabase.rpc('bulk_update_forum_status', {
                forum_ids: Array.from(selectedThreadIds),
                new_status: 'archived'
            });

            if (error) throw error;

            showToast(`Archived ${selectedThreadIds.size} forums.`, 'success');
            setThreads(prev => prev.map(t =>
                selectedThreadIds.has(t.id) ? { ...t, status: 'archived' as ForumThread['status'] } : t
            ));
            setSelectedThreadIds(new Set());
        } catch (err) {
            showToast('Failed to archive forums.', 'error');
        }
    };

    const handleSingleStatusUpdate = async (id: string, newStatus: string) => {
        showToast('Updating status...', 'info');
        try {
            // Route through the bulk RPC with a single-element array for consistency
            const { error } = await supabase.rpc('bulk_update_forum_status', {
                forum_ids: [id],
                new_status: newStatus
            });

            if (error) throw error;

            showToast('Forum status updated.', 'success');
            setThreads(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as ForumThread['status'] } : t));
        } catch (err) {
            showToast('Failed to update status.', 'error');
        }
    };

    const bulkActions: BulkAction[] = [
        // Status values match the forum_status DB enum (lowercase snake_case)
        { label: 'Set Read Only', onClick: () => handleUpdateStatus('read_only'), icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> },
        { label: 'Archive Selection', onClick: () => handleUpdateStatus('archived') },
        { label: 'Delete Selection', onClick: handleBulkDelete, variant: 'danger' }
    ];

    const stats = platformStats;

    return (
        <div className={adminStyles.container}>
            {ConfirmDialog}
            <PageHeader
                title="Forum Management" 
                subtitle="Monitor and moderate event forums and messages." 
            />

            <div className={adminStyles.statsGrid}>
                <StatCard 
                    label="Total Forums" 
                    value={stats.total} 
                    change="Platform history"
                    isLoading={isLoading} 
                />
                <StatCard 
                    label="Open Forums" 
                    value={stats.open} 
                    change="Real-time interaction"
                    trend="positive"
                    isLoading={isLoading} 
                />
                <StatCard 
                    label="Read-only Forums" 
                    value={stats.readOnly} 
                    change="Moderated state"
                    trend="neutral"
                    isLoading={isLoading} 
                />
                <StatCard 
                    label="Pending Escalations" 
                    value={stats.escalations} 
                    change="High priority"
                    trend={stats.escalations > 0 ? "negative" : "positive"}
                    isLoading={isLoading} 
                />
            </div>

            {/* ── Tab switcher ── */}
            <Tabs
                options={[
                    { id: 'forums', label: 'Forums' },
                    { id: 'messages', label: 'Messages' },
                    { id: 'media', label: 'Media' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* ── Forum list tab (existing content) ── */}
            {activeTab === 'forums' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <TableToolbar
                        searchPlaceholder="Search forum name or event..."
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                    >
                        {/* Status filter chips — aligned to forum_status schema enum */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                { value: 'all', label: 'All' },
                                { value: 'open', label: 'Open' },
                                { value: 'read_only', label: 'Read Only' },
                                { value: 'archived', label: 'Archived' },
                            ].map(({ value, label }) => (
                                <button
                                    key={value}
                                    className={`${adminStyles.chip} ${statusFilter === value ? adminStyles.chipActive : ''}`}
                                    onClick={() => setStatusFilter(value)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </TableToolbar>

                    <BulkActionsBar
                        selectedCount={selectedThreadIds.size}
                        actions={bulkActions}
                        onCancel={() => setSelectedThreadIds(new Set())}
                        itemTypeLabel="forums"
                    />

                    {isLoading ? (
                        <div style={{ padding: '60px', textAlign: 'center', opacity: 0.6 }}>Loading forums...</div>
                    ) : (
                        <ForumTable
                            threads={paginatedThreads}
                            selectedIds={selectedThreadIds}
                            onSelect={handleSelectThread}
                            onSelectAll={handleSelectAll}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            onStatusChange={handleSingleStatusUpdate}
                        />
                    )}
                </div>
            )}

            {/* ── Messages tab ── */}
            {activeTab === 'messages' && (
                <ForumMessagesTab />
            )}

            {/* ── Media tab ── */}
            {activeTab === 'media' && (
                <ForumMediaTab />
            )}
        </div>
    );
}

export default function AdminForumsPage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Forums...</div>}>
            <ForumsContent />
        </Suspense>
    );
}


