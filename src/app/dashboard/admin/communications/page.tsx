"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import ContentTable, { ContentItem } from '@/components/admin/content/ContentTable';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { LegalDocument, SystemBanner, BroadcastLog } from '@/types/admin';
import Tabs from '@/components/dashboard/Tabs';

// ...
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import LegalDocTable from '@/components/admin/content/LegalDocTable';
import Badge from '@/components/shared/Badge';
import DataTable, { Column } from '@/components/shared/DataTable';

function CommunicationsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const initialTab = (searchParams.get('tab') as any) || 'broadcast';
    const [activeTab, setActiveTab] = useState<'content' | 'broadcast' | 'legal' | 'banners'>(
        ['content', 'broadcast', 'legal', 'banners'].includes(initialTab) ? initialTab : 'broadcast'
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as any;
        if (tab && ['content', 'broadcast', 'legal', 'banners'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as any);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const [contents, setContents] = useState<ContentItem[]>([]);
    const [legalDocs, setLegalDocs] = useState<LegalDocument[]>([]);
    const [broadcastLogs, setBroadcastLogs] = useState<BroadcastLog[]>([]);
    const [banners, setBanners] = useState<SystemBanner[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [cmsRes, legalRes, broadcastRes, bannerRes] = await Promise.all([
                supabase.from('cms_pages').select('*').order('updated_at', { ascending: false }),
                supabase.from('legal_documents').select('*').order('effective_date', { ascending: false }),
                supabase.from('notification_broadcast_logs').select('*').order('created_at', { ascending: false }),
                supabase.from('system_banners').select('*').order('starts_at', { ascending: false })
            ]);

            if (cmsRes.data) {
                setContents(cmsRes.data.map(item => ({
                    id: item.id,
                    title: item.title,
                    slug: item.slug,
                    type: item.type,
                    author: 'System',
                    lastUpdated: new Date(item.updated_at).toLocaleDateString(),
                    status: item.status,
                    content: item.content
                })));
            }
            if (legalRes.data) setLegalDocs(legalRes.data);
            if (broadcastRes.data) setBroadcastLogs(broadcastRes.data);
            if (bannerRes.data) setBanners(bannerRes.data);
        } catch (error) {
            console.error('Error fetching communications data:', error);
            showToast('Failed to load some data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    // ─── Stats Calculation ──────────────────────────────────────────────
    const stats = {
        publishedPages: contents.filter(c => c.status === 'published').length,
        activePolicies: legalDocs.filter(l => l.is_active).length,
        totalNotifications: broadcastLogs.reduce((acc, log) => acc + (log.fcm_tokens_count || 0), 0),
        activeBanners: banners.filter(b => b.is_active).length
    };

    // ─── Legal Documents State & Pagination ──────────────────────────────
    const [legalDocPage, setLegalDocPage] = useState(1);
    const legalDocsPerPage = 5;
    const totalLegalPages = Math.ceil(legalDocs.length / legalDocsPerPage);
    const paginatedLegalDocs = legalDocs.slice(
        (legalDocPage - 1) * legalDocsPerPage,
        legalDocPage * legalDocsPerPage
    );

    const handleToggleLegalActive = async (doc: LegalDocument) => {
        try {
            // If activating, deactivate others of the same type
            if (!doc.is_active) {
                await supabase
                    .from('legal_documents')
                    .update({ is_active: false })
                    .eq('type', doc.type);
            }

            const { error } = await supabase
                .from('legal_documents')
                .update({ is_active: !doc.is_active })
                .eq('id', doc.id);

            if (error) throw error;
            showToast(`${doc.title} ${!doc.is_active ? 'activated' : 'deactivated'}`, 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    // ─── Content State & Search ──────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedContentIds, setSelectedContentIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const filteredContent = contents.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.slug.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || item.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
    });

    const totalPages = Math.ceil(filteredContent.length / itemsPerPage);
    const paginatedContent = filteredContent.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

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

    const handleBulkAction = async (action: 'publish' | 'archive' | 'delete') => {
        const ids = Array.from(selectedContentIds);
        showToast(`${action.charAt(0).toUpperCase() + action.slice(1)}ing items...`, 'info');

        try {
            let error;
            if (action === 'delete') {
                const res = await supabase.from('cms_pages').delete().in('id', ids);
                error = res.error;
            } else {
                const res = await supabase.from('cms_pages').update({ status: action === 'publish' ? 'published' : 'archived' }).in('id', ids);
                error = res.error;
            }

            if (error) throw error;
            showToast(`Bulk ${action} successful`, 'success');
            setSelectedContentIds(new Set());
            fetchData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const bulkActions: BulkAction[] = [
        { label: 'Publish Selected', onClick: () => handleBulkAction('publish'), variant: 'success' },
        { label: 'Archive Selected', onClick: () => handleBulkAction('archive') },
        { label: 'Delete Selected', onClick: () => handleBulkAction('delete'), variant: 'danger' }
    ];

    // ─── Broadcast Logs Handling ───────────────────────────────────────────
    const [broadcastSearch, setBroadcastSearch] = useState('');
    const filteredBroadcasts = broadcastLogs.filter(log =>
        log.subject.toLowerCase().includes(broadcastSearch.toLowerCase()) ||
        log.type.toLowerCase().includes(broadcastSearch.toLowerCase())
    );

    const broadcastColumns: Column<BroadcastLog>[] = [
        {
            header: 'Subject',
            render: (log) => (
                <div style={{ fontWeight: 600 }}>{log.subject}</div>
            ),
        },
        {
            header: 'Type',
            render: (log) => <Badge label={log.type.replace('_', ' ')} variant="info" />,
        },
        {
            header: 'Targeting',
            render: (log) => (
                <div style={{ fontSize: '13px' }}>
                    <span style={{ textTransform: 'capitalize' }}>{log.targeting_type}</span>
                    {(log.fcm_tokens_count || 0) > 0 && (
                        <span style={{ opacity: 0.6, marginLeft: '6px' }}>({log.fcm_tokens_count} tokens)</span>
                    )}
                </div>
            ),
        },
        {
            header: 'Sent Date',
            render: (log) => (
                <div style={{ fontSize: '12px', opacity: 0.6 }}>{new Date(log.created_at).toLocaleString()}</div>
            ),
        }
    ];

    // ─── Banner Logic ───
    const liveBanner = banners.find(b => b.is_active);

    const handleToggleBanner = async (banner: SystemBanner) => {
        try {
            const { error } = await supabase
                .from('system_banners')
                .update({ is_active: !banner.is_active })
                .eq('id', banner.id);
            if (error) throw error;
            showToast(`Banner ${!banner.is_active ? 'activated' : 'deactivated'}`, 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleDeleteBanner = async (id: string) => {
        if (!confirm('Are you sure you want to delete this banner?')) return;
        try {
            const { error } = await supabase.from('system_banners').delete().eq('id', id);
            if (error) throw error;
            showToast('Banner deleted', 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    return (
        <div className={styles.container}>
            <header className={adminStyles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className={adminStyles.title}>Communications</h1>
                    <p className={adminStyles.subtitle}>Manage platform content, system notifications, and emails.</p>
                </div>
                {(activeTab === 'content' || activeTab === 'legal' || activeTab === 'banners' || activeTab === 'broadcast') && (
                    <button
                        className={adminStyles.btnPrimary}
                        onClick={() => {
                            if (activeTab === 'content') router.push('/dashboard/admin/communications/create');
                            else if (activeTab === 'legal') router.push('/dashboard/admin/communications/legal/new');
                            else if (activeTab === 'broadcast') router.push('/dashboard/admin/communications/broadcast/create');
                            else router.push('/dashboard/admin/communications/banners/create');
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        {activeTab === 'content' ? 'New Content' : activeTab === 'legal' ? 'New Version' : activeTab === 'broadcast' ? 'New Broadcast' : 'Create Banner'}
                    </button>
                )}
            </header>

            <div className={adminStyles.statsGrid}>
                <div className={adminStyles.statCard} style={{ cursor: 'default' }}>
                    <span className={adminStyles.statLabel}>Published Pages</span>
                    <span className={adminStyles.statValue}>{stats.publishedPages}</span>
                    <span className={`${adminStyles.statChange} ${adminStyles.positive}`}>Live Assets</span>
                </div>
                <div className={adminStyles.statCard} style={{ cursor: 'default' }}>
                    <span className={adminStyles.statLabel}>Active Policies</span>
                    <span className={adminStyles.statValue}>{stats.activePolicies}</span>
                    <span className={`${adminStyles.statChange} ${adminStyles.positive}`}>Legally Compliant</span>
                </div>
                <div className={adminStyles.statCard} style={{ cursor: 'default' }}>
                    <span className={adminStyles.statLabel}>Notifications Sent</span>
                    <span className={adminStyles.statValue}>{stats.totalNotifications >= 1000 ? (stats.totalNotifications / 1000).toFixed(1) + 'k' : stats.totalNotifications}</span>
                    <span className={adminStyles.statLabel}>Historical Total</span>
                </div>
                <div className={adminStyles.statCard} style={{ cursor: 'default' }}>
                    <span className={adminStyles.statLabel}>Active Banners</span>
                    <span className={adminStyles.statValue}>{stats.activeBanners}</span>
                    <span className={`${adminStyles.statChange} ${stats.activeBanners > 0 ? adminStyles.positive : ''}`}>System Alerts</span>
                </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <Tabs
                options={[
                    { id: 'broadcast', label: 'Broadcast Notifications' },
                    { id: 'banners', label: 'System Banners' },
                    { id: 'content', label: 'Content & Pages' },
                    { id: 'legal', label: 'Legal Documents' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* ─── TAB: BROADCAST ─── */}
            {activeTab === 'broadcast' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <TableToolbar searchPlaceholder="Search history..." searchValue={broadcastSearch} onSearchChange={setBroadcastSearch} />
                    <DataTable<BroadcastLog> data={filteredBroadcasts} columns={broadcastColumns} emptyMessage="No broadcast history found." isLoading={isLoading} />
                </div>
            )}

            {/* ─── TAB: SYSTEM BANNERS ─── */}
            {activeTab === 'banners' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className={adminStyles.pageCard}>
                        <h2 className={adminStyles.sectionTitle} style={{ marginBottom: '20px' }}>Active & Scheduled Banners</h2>

                        {liveBanner ? (
                            <div style={{ marginBottom: '32px', padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-interface-outline)' }}>
                                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.5, marginBottom: '12px', fontWeight: 600 }}>Live Banner Highlight</div>
                                <div style={{
                                    padding: '16px',
                                    background: liveBanner.type === 'error' ? 'rgba(255, 77, 77, 0.08)' : liveBanner.type === 'warning' ? 'rgba(255, 193, 7, 0.08)' : 'rgba(32, 249, 40, 0.08)',
                                    borderLeft: `4px solid var(--color-brand-${liveBanner.type === 'info' ? 'primary' : liveBanner.type})`,
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={`var(--color-brand-${liveBanner.type === 'info' ? 'primary' : liveBanner.type})`} strokeWidth="2">
                                        {liveBanner.type === 'success' ? <polyline points="20 6 9 17 4 12" /> : <circle cx="12" cy="12" r="10" />}
                                    </svg>
                                    <div style={{ fontSize: '14px' }}>
                                        <strong style={{ color: `var(--color-brand-${liveBanner.type === 'info' ? 'primary' : liveBanner.type})` }}>{liveBanner.title}:</strong> {liveBanner.content}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: '32px', padding: '24px', textAlign: 'center', opacity: 0.5, border: '1px dashed var(--color-interface-outline)', borderRadius: '12px' }}>
                                No banners currently active.
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {banners.map(banner => (
                                <div key={banner.id} className={adminStyles.statCard} style={{ cursor: 'default', display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '20px', padding: '16px 24px' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{banner.title}</div>
                                        <div style={{ fontSize: '13px', opacity: 0.6 }}>
                                            {new Date(banner.starts_at).toLocaleDateString()} {banner.ends_at ? `- ${new Date(banner.ends_at).toLocaleDateString()}` : '(Ongoing)'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <Badge label={banner.type.toUpperCase()} variant={banner.type as any} />
                                        <Badge
                                            label={banner.is_active ? 'Live' : 'Inactive'}
                                            variant={banner.is_active ? 'success' : 'neutral'}
                                            showDot={banner.is_active}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className={adminStyles.btnSecondary} style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => router.push(`/dashboard/admin/communications/banners/edit/${banner.id}`)}>Edit</button>
                                        <button className={adminStyles.btnSecondary} style={{ padding: '6px 12px', fontSize: '12px', color: banner.is_active ? '#ff4d4d' : 'inherit' }} onClick={() => handleToggleBanner(banner)}>
                                            {banner.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button className={adminStyles.btnSecondary} style={{ padding: '6px 12px', fontSize: '12px', color: '#ff4d4d' }} onClick={() => handleDeleteBanner(banner.id)}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {banners.length === 0 && !isLoading && <div style={{ textAlign: 'center', padding: '16px 0', opacity: 0.5 }}>No banners found.</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB: CONTENT ─── */}
            {activeTab === 'content' && (
                <>
                    <TableToolbar searchPlaceholder="Search by title or slug..." searchValue={searchTerm} onSearchChange={setSearchTerm}>
                        <div className={adminStyles.filterGroup}>
                            {['all', 'page', 'post', 'announcement'].map(type => (
                                <button key={type} className={`${adminStyles.chip} ${typeFilter === type ? adminStyles.chipActive : ''}`} onClick={() => setTypeFilter(type)}>
                                    {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                                </button>
                            ))}
                        </div>
                    </TableToolbar>

                    <BulkActionsBar selectedCount={selectedContentIds.size} actions={bulkActions} onCancel={() => setSelectedContentIds(new Set())} itemTypeLabel="items" />

                    <ContentTable
                        items={paginatedContent}
                        selectedIds={selectedContentIds}
                        onSelect={handleSelectContent}
                        onSelectAll={handleSelectAll}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        isLoading={isLoading}
                    />
                </>
            )}

            {/* ─── TAB: LEGAL DOCUMENTS ─── */}
            {activeTab === 'legal' && (
                <LegalDocTable
                    documents={paginatedLegalDocs}
                    currentPage={legalDocPage}
                    totalPages={totalLegalPages}
                    onPageChange={setLegalDocPage}
                    onSetActive={handleToggleLegalActive}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
}

export default function AdminCommunicationsPage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Communications...</div>}>
            <CommunicationsContent />
        </Suspense>
    );
}
