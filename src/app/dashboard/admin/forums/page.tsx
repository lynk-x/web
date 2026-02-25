"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import ForumTable, { ForumThread } from '@/components/admin/forums/ForumTable';

/**
 * Mock forums — aligned to `forum_status` schema enum.
 * Note: the exact casing of the enum is preserved (Open, Read_only, Archived).
 * When wiring up: `supabase.from('forums').select('*, event:events!event_id(title)')`
 */
const mockThreads: ForumThread[] = [
    { id: '1', title: 'Summer Fest General Discussion', eventName: 'Summer Fest 2025', status: 'Open', announcementsCount: 5, liveChatsCount: 120, mediaCount: 45, lastActivity: '2 hours ago' },
    { id: '2', title: 'Tech Summit Backstage', eventName: 'Tech Summit 2025', status: 'Open', announcementsCount: 12, liveChatsCount: 85, mediaCount: 120, lastActivity: '10 mins ago' },
    { id: '3', title: 'Marathon Runners Hub', eventName: 'City Marathon', status: 'Open', announcementsCount: 3, liveChatsCount: 450, mediaCount: 300, lastActivity: '1 hour ago' },
    { id: '4', title: 'Jazz Night Chat', eventName: 'Smooth Jazz Night', status: 'Read_only', announcementsCount: 1, liveChatsCount: 20, mediaCount: 5, lastActivity: '5 mins ago' },
    { id: '5', title: 'Foodies Expo Forum', eventName: 'Gourmet Expo', status: 'Open', announcementsCount: 8, liveChatsCount: 340, mediaCount: 210, lastActivity: '1 day ago' },
    { id: '6', title: 'Oldies Concert Q&A', eventName: 'Retro Hits Live', status: 'Read_only', announcementsCount: 0, liveChatsCount: 0, mediaCount: 15, lastActivity: '1 week ago' },
    { id: '7', title: 'Charity Auction Room', eventName: 'Annual Charity Gala', status: 'Open', announcementsCount: 6, liveChatsCount: 95, mediaCount: 80, lastActivity: '6 hours ago' },
    { id: '8', title: 'Gaming Tourney Talk', eventName: 'Elite Gaming Op', status: 'Archived', announcementsCount: 4, liveChatsCount: 1200, mediaCount: 500, lastActivity: '2 days ago' },
];

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import { exportToCSV } from '@/utils/export';

export default function AdminForumsPage() {
    const { showToast } = useToast();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic — aligned to forum_status enum (Open | Read_only | Archived)
    const filteredThreads = mockThreads.filter(thread => {
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

    // Reset pagination when search OR status filter changes
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

    // --- Global Actions (No selection required) ---
    const handlePlatformAlert = () => {
        showToast('Opening Platform Alert composer...', 'info');
    };

    const handleGlobalReadOnly = () => {
        showToast('Executing global read-only mode for forums...', 'warning');
    };

    const handleAddAIModerator = () => {
        showToast('AI Moderator is now monitoring these events.', 'success');
    };

    const handleDownloadMasterCSV = () => {
        showToast('Generating master platform report...', 'info');
        exportToCSV(mockThreads, 'platform_forums_master_report');
        showToast('Master CSV ready.', 'success');
    };

    const handleCallModerator = () => {
        showToast(`Notifying a moderator for ${selectedThreadIds.size} threads...`, 'info');
        setTimeout(() => {
            showToast('Moderator has been paged.', 'success');
            setSelectedThreadIds(new Set());
        }, 1000);
    };

    const handleSetReadOnly = () => {
        showToast(`Setting ${selectedThreadIds.size} threads to read-only...`, 'info');
        setTimeout(() => {
            showToast('Threads set to read-only mode.', 'info');
            setSelectedThreadIds(new Set());
        }, 1000);
    };

    const handleViewLogs = () => {
        showToast(`Fetching activity logs for ${selectedThreadIds.size} threads...`, 'info');
        router.push('/dashboard/admin/audit-logs');
    };

    const handleExportCSV = () => {
        const selectedThreads = mockThreads.filter(t => selectedThreadIds.has(t.id));
        showToast(`Generating CSV for ${selectedThreadIds.size} threads...`, 'info');
        exportToCSV(selectedThreads, 'forum_moderation_export');
        showToast('CSV export ready.', 'success');
        setSelectedThreadIds(new Set());
    };

    const bulkActions: BulkAction[] = [
        {
            label: 'Set Read Only',
            onClick: handleSetReadOnly,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        },
        {
            label: 'Add AI Moderator',
            onClick: handleAddAIModerator,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 12L2.69 7"></path><path d="M12 22a10 10 0 0 0 10-10H12v10z"></path></svg>
        },
        {
            label: 'View Logs',
            onClick: handleViewLogs,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
        },
        {
            label: 'Export Selection',
            onClick: handleExportCSV,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Forum Management</h1>
                    <p className={adminStyles.subtitle}>Manage categories, threads, and community discussions.</p>
                </div>
                <button className={adminStyles.btnPrimary} onClick={handlePlatformAlert}>Platform Alert</button>
            </header>

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


            <ForumTable
                threads={paginatedThreads}
                selectedIds={selectedThreadIds}
                onSelect={handleSelectThread}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
