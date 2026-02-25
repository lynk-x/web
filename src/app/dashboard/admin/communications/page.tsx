"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import ContentTable, { ContentItem } from '@/components/admin/content/ContentTable';
import Link from 'next/link';

// Outreach Imports
import RichTextEditor from '@/components/ui/RichTextEditor';
import OutreachPreview from '@/components/admin/outreach/OutreachPreview';

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import LegalDocTable, { LegalDocument } from '@/components/admin/content/LegalDocTable';

/**
 * Mock content items for the Content & Pages tab.
 * When wiring up: `supabase.from('cms_pages').select('*')` (or your CMS source)
 */
const mockContent: ContentItem[] = [
    { id: '1', title: 'Terms of Service', slug: '/terms', type: 'page', author: 'Legal Team', lastUpdated: '2 weeks ago', status: 'published' },
    { id: '2', title: 'Privacy Policy', slug: '/privacy', type: 'page', author: 'Legal Team', lastUpdated: '1 month ago', status: 'published' },
    { id: '3', title: 'FAQ', slug: '/faq', type: 'page', author: 'Support Team', lastUpdated: '3 days ago', status: 'published' },
    { id: '4', title: 'Welcome to Lynk-X 2.0', slug: '/blog/welcome-v2', type: 'post', author: 'Marketing', lastUpdated: '1 day ago', status: 'published' },
    { id: '5', title: 'Maintenance Window', slug: '/announcements/maintenance-oct25', type: 'announcement', author: 'DevOps', lastUpdated: '5 hours ago', status: 'draft' },
    { id: '6', title: 'Community Guidelines', slug: '/guidelines', type: 'page', author: 'Community Mgr', lastUpdated: '2 months ago', status: 'published' },
    { id: '7', title: 'Top 10 Event Tips', slug: '/blog/event-tips', type: 'post', author: 'Content Team', lastUpdated: '1 week ago', status: 'draft' },
    { id: '8', title: 'Legacy API Docs', slug: '/docs/api/v1', type: 'page', author: 'Tech Writers', lastUpdated: '1 year ago', status: 'archived' },
];

/**
 * Mock legal documents — aligned to `legal_documents` table + `legal_document_type` enum.
 * Type definition lives in LegalDocTable.tsx (imported above).
 * When wiring up:
 *   supabase.from('legal_documents').select('*').order('type, effective_date', { ascending: false })
 */
const mockLegalDocs: LegalDocument[] = [
    { id: 'ld-1', type: 'terms_of_service', version: 'v3.0', title: 'Terms of Service', is_active: true, effective_date: 'Jan 1, 2025' },
    { id: 'ld-2', type: 'privacy_policy', version: 'v2.1', title: 'Privacy Policy', is_active: true, effective_date: 'Mar 15, 2025' },
    { id: 'ld-3', type: 'organizer_agreement', version: 'v1.2', title: 'Organizer Agreement', is_active: true, effective_date: 'Feb 1, 2025' },
    { id: 'ld-4', type: 'terms_of_service', version: 'v2.5', title: 'Terms of Service (prev)', is_active: false, effective_date: 'Jun 1, 2024' },
    { id: 'ld-5', type: 'privacy_policy', version: 'v2.0', title: 'Privacy Policy (prev)', is_active: false, effective_date: 'Aug 10, 2024' },
    { id: 'ld-6', type: 'organizer_agreement', version: 'v1.0', title: 'Organizer Agreement (v1)', is_active: false, effective_date: 'Jan 15, 2024' },
];

export default function AdminCommunicationsPage() {
    const { showToast } = useToast();

    // Top-Level Tabs — 'legal' backed by `legal_documents` table
    const [activeTab, setActiveTab] = useState<'content' | 'notifications' | 'legal'>('content');

    // ─── Legal Documents State ─── backed by `legal_documents` table ────────
    const [legalDocPage, setLegalDocPage] = useState(1);
    const legalDocsPerPage = 5;
    const totalLegalPages = Math.ceil(mockLegalDocs.length / legalDocsPerPage);
    const paginatedLegalDocs = mockLegalDocs.slice(
        (legalDocPage - 1) * legalDocsPerPage,
        legalDocPage * legalDocsPerPage
    );

    // ─── Content State ──────────────────────────────────────────────────
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

    // ─── Outreach/Notifications State ─────────────────────────────────────
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    /**
     * `notification_type` enum from schema:
     * system | social | marketing | event_update | money_in | money_out
     */
    const [notificationType, setNotificationType] = useState<
        'system' | 'social' | 'marketing' | 'event_update' | 'money_in' | 'money_out'
    >('system');

    const handleSendNotification = () => {
        showToast(`Sending ${notificationType} notification...`, 'info');
        setTimeout(() => {
            showToast('Notification Sent Successfully', 'success');
            setSubject('');
            setMessage('');
        }, 1000);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Communications</h1>
                    <p className={adminStyles.subtitle}>Manage platform content, system notifications, and emails.</p>
                </div>
                {activeTab === 'content' && (
                    <Link href="/dashboard/admin/content/create">
                        <button className={adminStyles.btnPrimary}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            New Content
                        </button>
                    </Link>
                )}
            </header>

            {/* Sub-Navigation Tabs */}
            <div className={adminStyles.tabs}>
                <button
                    className={`${adminStyles.tab} ${activeTab === 'content' ? adminStyles.tabActive : ''}`}
                    onClick={() => setActiveTab('content')}
                >
                    Content &amp; Pages
                </button>
                <button
                    className={`${adminStyles.tab} ${activeTab === 'legal' ? adminStyles.tabActive : ''}`}
                    onClick={() => setActiveTab('legal')}
                >
                    Legal Documents
                </button>
                <button
                    className={`${adminStyles.tab} ${activeTab === 'notifications' ? adminStyles.tabActive : ''}`}
                    onClick={() => setActiveTab('notifications')}
                >
                    User Notifications
                </button>
            </div>

            {/* ─── TAB: CONTENT ─── */}
            {activeTab === 'content' && (
                <>
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
                </>
            )}

            {/* ─── TAB: LEGAL DOCUMENTS ─── */}
            {/* Backed by `legal_documents` table + `legal_document_type` enum */}
            {activeTab === 'legal' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                        <button className={adminStyles.btnPrimary} onClick={() => showToast('Opening legal document editor...', 'info')}>
                            + New Version
                        </button>
                    </div>
                    <LegalDocTable
                        documents={paginatedLegalDocs}
                        currentPage={legalDocPage}
                        totalPages={totalLegalPages}
                        onPageChange={setLegalDocPage}
                        onSetActive={(doc) =>
                            showToast(`Activating ${doc.title} (${doc.version}) — deactivates current ${doc.type} version.`, 'success')
                        }
                    />
                </>
            )}

            {/* ─── TAB: NOTIFICATIONS ─── */}
            {/* `notification_type` enum: system | social | marketing | event_update | money_in | money_out */}
            {activeTab === 'notifications' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className={adminStyles.statCard} style={{ cursor: 'default', transform: 'none' }}>
                        <h2 className={styles.sectionTitle} style={{ marginBottom: '24px' }}>New Push Notification</h2>
                        <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} onSubmit={(e) => e.preventDefault()}>
                            <div>
                                <label className={adminStyles.label}>Notification Type</label>
                                <select
                                    className={adminStyles.select}
                                    style={{ width: '100%' }}
                                    value={notificationType}
                                    onChange={(e) => setNotificationType(e.target.value as typeof notificationType)}
                                >
                                    {/* Aligned to `notification_type` schema enum */}
                                    <option value="system">System</option>
                                    <option value="social">Social</option>
                                    <option value="marketing">Marketing</option>
                                    <option value="event_update">Event Update</option>
                                    <option value="money_in">Money In</option>
                                    <option value="money_out">Money Out</option>
                                </select>
                            </div>
                            <div>
                                <label className={adminStyles.label}>Subject</label>
                                <input
                                    type="text"
                                    placeholder="Notification Title"
                                    className={adminStyles.input}
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={adminStyles.label}>Message</label>
                                <RichTextEditor
                                    value={message}
                                    onChange={setMessage}
                                    placeholder="Type your alert message here..."
                                />
                            </div>
                            <button
                                type="button"
                                className={adminStyles.btnPrimary}
                                style={{ alignSelf: 'flex-start' }}
                                onClick={handleSendNotification}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 8 }}>
                                    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Send Notification
                            </button>
                        </form>
                    </div>

                    <div className={adminStyles.statCard} style={{ cursor: 'default', transform: 'none' }}>
                        <h2 className={styles.sectionTitle} style={{ marginBottom: '24px' }}>Audience Preview</h2>
                        <OutreachPreview
                            subject={subject}
                            message={message}
                            audience={notificationType}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
