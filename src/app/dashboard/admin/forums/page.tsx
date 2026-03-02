"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import ForumTable, { ForumThread } from '@/components/admin/forums/ForumTable';
import ForumMessagesTab from '@/components/admin/forums/ForumMessagesTab';
import Link from 'next/link';
import Tabs from '@/components/dashboard/Tabs';

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

function ForumsContent() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const initialTab = (searchParams.get('tab') as any) || 'forums';
    const [activeTab, setActiveTab] = useState<'forums' | 'messages'>(
        ['forums', 'messages'].includes(initialTab) ? initialTab : 'forums'
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as any;
        if (tab && ['forums', 'messages'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as any);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };
    const [threads, setThreads] = useState<ForumThread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        const fetchForums = async () => {
            setIsLoading(true);
            try {
                // Fetch from our new public materialized view
                const { data, error } = await supabase
                    .from('mv_forum_performance')
                    .select('*')
                    .order('last_activity_at', { ascending: false });

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
            } catch (err) {
                console.error('Error fetching forums:', err);
                showToast('Failed to load forum management data.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchForums();
    }, [supabase, showToast]);

    // Filter Logic
    const filteredThreads = threads.filter(thread => {
        const matchesSearch = thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            thread.eventName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || thread.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredThreads.length / itemsPerPage);
    const paginatedThreads = filteredThreads.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

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
            const { error } = await supabase
                .from('forums')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .in('id', Array.from(selectedThreadIds));

            if (error) throw error;

            showToast(`Successfully moved ${count} forums to ${newStatus}.`, 'success');

            // Refresh local state to avoid full re-fetch
            setThreads(prev => prev.map(t =>
                selectedThreadIds.has(t.id) ? { ...t, status: newStatus as any } : t
            ));
            setSelectedThreadIds(new Set());
        } catch (err) {
            showToast('Failed to update forum status.', 'error');
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure? This will delete ${selectedThreadIds.size} forums. This action cannot be undone.`)) return;

        showToast(`Deleting ${selectedThreadIds.size} forums...`, 'info');
        try {
            const { error } = await supabase
                .from('forums')
                .delete()
                .in('id', Array.from(selectedThreadIds));

            if (error) throw error;

            showToast(`Deleted ${selectedThreadIds.size} forums.`, 'success');
            setThreads(prev => prev.filter(t => !selectedThreadIds.has(t.id)));
            setSelectedThreadIds(new Set());
        } catch (err) {
            showToast('Failed to delete forums.', 'error');
        }
    };

    const handlePlatformAlert = () => {
        // Removed as per request
    };

    const handleSingleStatusUpdate = async (id: string, newStatus: string) => {
        showToast('Updating status...', 'info');
        try {
            const { error } = await supabase
                .from('forums')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            showToast('Forum status updated.', 'success');
            setThreads(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
        } catch (err) {
            showToast('Failed to update status.', 'error');
        }
    };

    const bulkActions: BulkAction[] = [
        { label: 'Set Read Only', onClick: () => handleUpdateStatus('Read_only'), icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> },
        { label: 'Archive Selection', onClick: () => handleUpdateStatus('Archived') },
        { label: 'Delete Selection', onClick: handleBulkDelete, variant: 'danger' }
    ];

    return (
        <div className={styles.container}>
            <header className={adminStyles.header}>
                <div>
                    <h1 className={adminStyles.title}>Forum Management</h1>
                    <p className={adminStyles.subtitle}>Monitor and moderate event forums and messages.</p>
                </div>
            </header>

            {/* ── Tab switcher ── */}
            <Tabs
                options={[
                    { id: 'forums', label: 'Forums' },
                    { id: 'messages', label: 'Messages' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* ── Forum list tab (existing content) ── */}
            {activeTab === 'forums' && (
                <>
                    <TableToolbar
                        searchPlaceholder="Search forum name or event..."
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                    >
                        {/* Status filter chips — aligned to forum_status schema enum */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                { value: 'all', label: 'All' },
                                { value: 'Open', label: 'Open' },
                                { value: 'Read_only', label: 'Read Only' },
                                { value: 'Archived', label: 'Archived' },
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
                </>
            )}

            {/* ── Messages tab (new) ── */}
            {activeTab === 'messages' && (
                <div style={{ marginTop: '16px' }}>
                    <ForumMessagesTab />
                </div>
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


