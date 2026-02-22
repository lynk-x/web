"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import ForumTable, { ForumThread } from '@/components/admin/forums/ForumTable';

// Mock Data
const mockThreads: ForumThread[] = [
    { id: '1', title: 'Start Here: Welcome to the Community', author: 'System Admin', category: 'announcements', status: 'active', replies: 45, views: 1200, lastActivity: '2 hours ago' },
    { id: '2', title: 'Looking for a ride to Summer Fest?', author: 'FestivalGoer', category: 'general', status: 'active', replies: 12, views: 340, lastActivity: '10 mins ago' },
    { id: '3', title: 'Best practices for promoting hybrid events?', author: 'EventPro22', category: 'support', status: 'active', replies: 8, views: 215, lastActivity: '1 hour ago' },
    { id: '4', title: 'Selling 2 VIP tickets (Sold Out)', author: 'Scalper??', category: 'general', status: 'flagged', replies: 3, views: 890, lastActivity: '5 mins ago' },
    { id: '5', title: 'Post-Event Discussion: Tech Summit 2025', author: 'TechieDave', category: 'feedback', status: 'active', replies: 28, views: 1500, lastActivity: '1 day ago' },
    { id: '6', title: 'Community Guidelines: Ticket Resale Policy', author: 'Moderator', category: 'announcements', status: 'locked', replies: 0, views: 5000, lastActivity: '1 week ago' },
    { id: '7', title: 'Request: Add multi-day ticket bundles', author: 'OrganizerJane', category: 'feedback', status: 'active', replies: 15, views: 420, lastActivity: '6 hours ago' },
    { id: '8', title: 'Lost my wallet at the Marathon', author: 'RunnerHigh', category: 'general', status: 'hidden', replies: 2, views: 45, lastActivity: '2 days ago' },
];

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';

export default function AdminForumsPage() {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic
    const filteredThreads = mockThreads.filter(thread => {
        const matchesSearch = thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            thread.author.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || thread.category === categoryFilter;
        const matchesStatus = statusFilter === 'all' || thread.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
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
        setSelectedThreadIds(new Set()); // Clear selection on filter change
    }, [searchTerm, categoryFilter, statusFilter]);

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

    const handleBulkLock = () => {
        showToast(`Locking ${selectedThreadIds.size} threads...`, 'info');
        setTimeout(() => {
            showToast('Threads locked.', 'info');
            setSelectedThreadIds(new Set());
        }, 1000);
    };

    const handleBulkHide = () => {
        showToast(`Hiding ${selectedThreadIds.size} threads...`, 'info');
        setTimeout(() => {
            showToast('Threads hidden from public view.', 'warning');
            setSelectedThreadIds(new Set());
        }, 1000);
    };

    const handleBulkDelete = () => {
        showToast(`Deleting ${selectedThreadIds.size} threads...`, 'info');
        setTimeout(() => {
            showToast(`Successfully deleted ${selectedThreadIds.size} threads.`, 'success');
            setSelectedThreadIds(new Set());
        }, 1000);
    };

    const bulkActions: BulkAction[] = [
        { label: 'Lock Selected', onClick: handleBulkLock },
        { label: 'Hide Selected', onClick: handleBulkHide },
        { label: 'Delete Selected', onClick: handleBulkDelete, variant: 'danger' }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Forum Moderation</h1>
                    <p className={adminStyles.subtitle}>Manage categories, threads, and community discussions.</p>
                </div>
                <button className={adminStyles.btnPrimary}>+ New Announcement</button>
            </header>

            <TableToolbar
                searchPlaceholder="Search threads or authors..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <select
                        className={adminStyles.select}
                        style={{ padding: '8px 12px', fontSize: '13px' }}
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="all">All Categories</option>
                        <option value="general">General</option>
                        <option value="announcements">Announcements</option>
                        <option value="support">Support</option>
                        <option value="feedback">Feedback</option>
                    </select>

                    {['all', 'active', 'flagged', 'locked', 'hidden'].map((status) => (
                        <button
                            key={status}
                            className={`${adminStyles.chip} ${statusFilter === status ? adminStyles.chipActive : ''}`}
                            onClick={() => setStatusFilter(status)}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </TableToolbar>

            <BulkActionsBar
                selectedCount={selectedThreadIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedThreadIds(new Set())}
                itemTypeLabel="threads"
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
