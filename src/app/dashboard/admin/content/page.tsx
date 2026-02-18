"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import ContentTable, { ContentItem } from '@/components/admin/ContentTable';

// Mock Data
const mockContent: ContentItem[] = [
    { id: '1', title: 'Terms of Service', slug: '/terms', type: 'page', author: 'Legal Team', lastUpdated: '2 weeks ago', status: 'published' },
    { id: '2', title: 'Privacy Policy', slug: '/privacy', type: 'page', author: 'Legal Team', lastUpdated: '1 month ago', status: 'published' },
    { id: '3', title: 'FAQ', slug: '/faq', type: 'page', author: 'Support Team', lastUpdated: '3 days ago', status: 'published' },
    { id: '4', title: 'Welcome to Lynk-X 2.0', slug: '/blog/welcome-v2', type: 'post', author: 'Marketing', lastUpdated: '1 day ago', status: 'published' },
    { id: '5', title: 'Maintenance Window - Oct 25', slug: '/announcements/maintenance-oct25', type: 'announcement', author: 'DevOps', lastUpdated: '5 hours ago', status: 'draft' },
    { id: '6', title: 'Community Guidelines', slug: '/guidelines', type: 'page', author: 'Community Mgr', lastUpdated: '2 months ago', status: 'published' },
    { id: '7', title: 'Top 10 Event Tips', slug: '/blog/event-tips', type: 'post', author: 'Content Team', lastUpdated: '1 week ago', status: 'draft' },
    { id: '8', title: 'Legacy API Docs', slug: '/docs/api/v1', type: 'page', author: 'Tech Writers', lastUpdated: '1 year ago', status: 'archived' },
];

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';

export default function AdminContentPage() {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedContentIds, setSelectedContentIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic
    const filteredContent = mockContent.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.slug.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || item.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredContent.length / itemsPerPage);
    const paginatedContent = filteredContent.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedContentIds(new Set());
    }, [searchTerm, typeFilter, statusFilter]);

    // Selection Logic
    const handleSelectContent = (id: string) => {
        const newSelected = new Set(selectedContentIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedContentIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedContentIds.size === paginatedContent.length) {
            setSelectedContentIds(new Set());
        } else {
            const newSelected = new Set(selectedContentIds);
            paginatedContent.forEach(item => newSelected.add(item.id));
            setSelectedContentIds(newSelected);
        }
    };

    const handleBulkPublish = () => {
        showToast(`Publishing ${selectedContentIds.size} items...`, 'info');
        setTimeout(() => {
            showToast('Content published successfully.', 'success');
            setSelectedContentIds(new Set());
        }, 1000);
    };

    const handleBulkArchive = () => {
        showToast(`Archiving ${selectedContentIds.size} items...`, 'info');
        setTimeout(() => {
            showToast('Content archived.', 'warning');
            setSelectedContentIds(new Set());
        }, 1000);
    };

    const handleBulkDelete = () => {
        showToast(`Deleting ${selectedContentIds.size} items...`, 'info');
        setTimeout(() => {
            showToast(`Successfully deleted ${selectedContentIds.size} items.`, 'success');
            setSelectedContentIds(new Set());
        }, 1000);
    };

    const bulkActions: BulkAction[] = [
        { label: 'Publish Selected', onClick: handleBulkPublish, variant: 'success' },
        { label: 'Archive Selected', onClick: handleBulkArchive },
        { label: 'Delete Selected', onClick: handleBulkDelete, variant: 'danger' }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Content Management (CMS)</h1>
                    <p className={adminStyles.subtitle}>Create and manage pages, posts, and announcements.</p>
                </div>
                <button className={adminStyles.btnPrimary}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    New Content
                </button>
            </header>

            <TableToolbar
                searchPlaceholder="Search by title or slug..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <div className={styles.filterGroup}>
                        {['all', 'page', 'post', 'announcement'].map(type => (
                            <button
                                key={type}
                                className={`${adminStyles.chip} ${typeFilter === type ? adminStyles.chipActive : ''}`}
                                onClick={() => setTypeFilter(type)}
                                style={{ textTransform: 'capitalize' }}
                            >
                                {type === 'all' ? 'All Types' : type + 's'}
                            </button>
                        ))}
                    </div>
                </div>
            </TableToolbar>

            <BulkActionsBar
                selectedCount={selectedContentIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedContentIds(new Set())}
                itemTypeLabel="items"
            />

            <ContentTable
                items={paginatedContent}
                selectedIds={selectedContentIds}
                onSelect={handleSelectContent}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
