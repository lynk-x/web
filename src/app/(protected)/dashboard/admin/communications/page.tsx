"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import ContentTable, { ContentItem } from '@/components/admin/content/ContentTable';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { LegalDocument, SystemBanner, BroadcastLog, Spotlight } from '@/types/admin';
import Tabs from '@/components/dashboard/Tabs';
import StatCard from '@/components/dashboard/StatCard';

// ...
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import LegalDocTable from '@/components/admin/content/LegalDocTable';
import Badge from '@/components/shared/Badge';
import DataTable, { Column } from '@/components/shared/DataTable';
import { useConfirmModal } from '@/hooks/useConfirmModal';

function CommunicationsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const supabase = useMemo(() => createClient(), []);

    const initialTab = (searchParams.get('tab') as string) || 'spotlights';
    const [activeTab, setActiveTab] = useState<'content' | 'broadcast' | 'legal' | 'banners' | 'spotlights'>(
        ['content', 'broadcast', 'legal', 'banners', 'spotlights'].includes(initialTab) ? initialTab as 'content' | 'broadcast' | 'legal' | 'banners' | 'spotlights' : 'spotlights'
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as string;
        if (tab && ['content', 'broadcast', 'legal', 'banners', 'spotlights'].includes(tab)) {
            setActiveTab(tab as typeof activeTab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as Extract<typeof activeTab, string>);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const [contents, setContents] = useState<ContentItem[]>([]);
    const [contentTotal, setContentTotal] = useState(0);
    const [publishedPagesCount, setPublishedPagesCount] = useState(0);
    const [legalDocs, setLegalDocs] = useState<LegalDocument[]>([]);
    const [legalTotal, setLegalTotal] = useState(0);
    const [broadcastLogs, setBroadcastLogs] = useState<BroadcastLog[]>([]);
    const [banners, setBanners] = useState<SystemBanner[]>([]);
    const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ─── Legal Documents State & Pagination ──────────────────────────────
    const [legalDocPage, setLegalDocPage] = useState(1);
    const legalDocsPerPage = 5;

    // ─── Content State & Search ──────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedContentIds, setSelectedContentIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const cmsFrom = (currentPage - 1) * itemsPerPage;
            const legalFrom = (legalDocPage - 1) * legalDocsPerPage;

            const { data: cmsData, error: cmsError } = await supabase.rpc('get_admin_cms_list', {
                p_search: searchTerm,
                p_type: typeFilter,
                p_status: statusFilter,
                p_offset: cmsFrom,
                p_limit: itemsPerPage
            });

            const [legalRes, broadcastRes, bannerRes, spotlightRes] = await Promise.all([
                supabase
                    .from('legal_documents')
                    .select('*', { count: 'exact' })
                    .order('effective_date', { ascending: false })
                    .range(legalFrom, legalFrom + legalDocsPerPage - 1),
                // notification_broadcast_logs lives in its own schema
                supabase
                    .schema('notification_broadcast_logs')
                    .from('notification_broadcast_logs')
                    .select('*')
                    .order('created_at', { ascending: false }),
                supabase.from('system_banners').select('*').order('starts_at', { ascending: false }),
                supabase.from('spotlights').select('*').order('target', { ascending: true }).order('display_order', { ascending: true })
            ]);

            if (cmsData) {
                setContents(cmsData.map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    slug: item.slug,
                    type: item.type,
                    author: 'System',
                    lastUpdated: new Date(item.updated_at).toLocaleDateString(),
                    status: item.status,
                    content: '' // Don't fetch full content in list
                })));
                setContentTotal(cmsData?.[0]?.total_count || 0);
            }
            if (legalRes.data) {
                setLegalDocs(legalRes.data);
                setLegalTotal(legalRes.count ?? 0);
            }
            if (broadcastRes.data) setBroadcastLogs(broadcastRes.data);
            if (bannerRes.data) setBanners(bannerRes.data);
            if (spotlightRes.data) setSpotlights(spotlightRes.data);
        } catch (error) {
            showToast('Failed to load some data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, currentPage, itemsPerPage, legalDocPage, legalDocsPerPage, searchTerm, typeFilter, statusFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Fetch platform-wide published pages count once (unaffected by tab filters)
    useEffect(() => {
        supabase
            .from('cms_pages')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'published')
            .then(({ count }) => { if (count !== null) setPublishedPagesCount(count); });
    }, [supabase]);

    // ─── Stats Calculation ──────────────────────────────────────────────
    const stats = {
        publishedPages: publishedPagesCount,
        activePolicies: legalDocs.filter(l => l.is_active).length,
        totalNotifications: broadcastLogs.reduce((acc, log) => acc + (log.fcm_tokens_count || 0), 0),
        activeSpotlights: spotlights.filter(s => s.is_active).length
    };

    // ─── Legal Documents Pagination ──────────────────────────────────────
    const totalLegalPages = Math.ceil(legalTotal / legalDocsPerPage);
    const paginatedLegalDocs = legalDocs;

    const handleToggleLegalActive = async (doc: LegalDocument) => {
        try {
            const { error } = await supabase.rpc('manage_legal_document', {
                p_doc_id: doc.id,
                p_is_active: !doc.is_active
            });

            if (error) throw error;
            showToast(`${doc.title} ${!doc.is_active ? 'activated' : 'deactivated'}`, 'success');
            fetchData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const totalPages = Math.ceil(contentTotal / itemsPerPage);
    const paginatedContent = contents;

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
                const res = await supabase.rpc('bulk_update_cms_status', {
                    page_ids: ids,
                    new_status: action === 'publish' ? 'published' : 'archived'
                });
                error = res.error;
            }

            if (error) throw error;
            showToast(`Bulk ${action} successful`, 'success');
            setSelectedContentIds(new Set());
            fetchData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
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
            render: (log) => <Badge label={(log.type || 'unknown').replace('_', ' ')} variant="info" />,
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
            const { error } = await supabase.rpc('manage_system_banner', {
                p_banner_id: banner.id,
                p_is_active: !banner.is_active
            });
            if (error) throw error;
            showToast(`Banner ${!banner.is_active ? 'activated' : 'deactivated'}`, 'success');
            fetchData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleDeleteBanner = async (id: string) => {
        if (!await confirm('Are you sure you want to delete this banner?')) return;
        try {
            const { error } = await supabase.from('system_banners').delete().eq('id', id);
            if (error) throw error;
            showToast('Banner deleted', 'success');
            fetchData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    // ─── Spotlight Logic ───
    const handleToggleSpotlight = async (spotlight: Spotlight) => {
        try {
            const { error } = await supabase
                .from('spotlights')
                .update({ is_active: !spotlight.is_active })
                .eq('id', spotlight.id);
            if (error) throw error;
            showToast(`Spotlight ${!spotlight.is_active ? 'activated' : 'deactivated'}`, 'success');
            fetchData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleDeleteSpotlight = async (id: string) => {
        if (!await confirm('Are you sure you want to delete this spotlight?')) return;
        try {
            const { error } = await supabase.from('spotlights').delete().eq('id', id);
            if (error) throw error;
            showToast('Spotlight deleted', 'success');
            fetchData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    return (
        <div className={adminStyles.container}>
            {ConfirmDialog}
            <header className={adminStyles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className={adminStyles.title}>Communications</h1>
                    <p className={adminStyles.subtitle}>Manage platform content, spotlights and notifications.</p>
                </div>
                <button
                    className={adminStyles.btnPrimary}
                    onClick={() => {
                        if (activeTab === 'spotlights') router.push('/dashboard/admin/communications/spotlights/create');
                        else if (activeTab === 'content') router.push('/dashboard/admin/communications/create');
                        else if (activeTab === 'legal') router.push('/dashboard/admin/communications/legal/new');
                        else if (activeTab === 'broadcast') router.push('/dashboard/admin/communications/broadcast/create');
                        else router.push('/dashboard/admin/communications/banners/create');
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    {activeTab === 'spotlights' ? 'New Spotlight' :
                        activeTab === 'content' ? 'New Content' :
                            activeTab === 'legal' ? 'New Version' :
                                activeTab === 'broadcast' ? 'New Broadcast' : 'Create Banner'}
                </button>
            </header>

            <div className={adminStyles.statsGrid}>
                <StatCard 
                    label="Hero Spotlights" 
                    value={stats.activeSpotlights} 
                    change="Active showcases"
                    trend="positive"
                    isLoading={isLoading} 
                />
                <StatCard 
                    label="Published Pages" 
                    value={stats.publishedPages} 
                    change="Information assets"
                    trend="neutral"
                    isLoading={isLoading} 
                />
                <StatCard 
                    label="Active Policies" 
                    value={stats.activePolicies} 
                    change="Platform compliance"
                    trend="positive"
                    isLoading={isLoading} 
                />
                <StatCard 
                    label="Total Reach" 
                    value={stats.totalNotifications >= 1000 ? (stats.totalNotifications / 1000).toFixed(1) + 'k' : stats.totalNotifications} 
                    change="Broadcast impact"
                    trend="neutral"
                    isLoading={isLoading} 
                />
            </div>

            {/* Sub-Navigation Tabs */}
            <Tabs
                options={[
                    { id: 'spotlights', label: 'Hero Spotlights' },
                    { id: 'broadcast', label: 'Broadcasts' },
                    { id: 'banners', label: 'Alert Banners' },
                    { id: 'content', label: 'Info Pages' },
                    { id: 'legal', label: 'Legals' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* ─── TAB: SPOTLIGHTS ─── */}
            {activeTab === 'spotlights' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                    <div className={adminStyles.pageCard}>
                        <h2 className={adminStyles.sectionTitle} style={{ marginBottom: '20px' }}>Hero Spotlights</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {spotlights.map(s => (
                                <div key={s.id} className={adminStyles.statCard} style={{
                                    cursor: 'default',
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(200px, 1fr) auto auto',
                                    alignItems: 'center',
                                    gap: '20px',
                                    padding: '16px 24px',
                                    background: 'var(--color-interface-surface)',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        {s.background_url && (
                                            <div style={{ width: '60px', height: '40px', borderRadius: '4px', background: `url(${s.background_url}) no-repeat center`, backgroundSize: 'cover' }} />
                                        )}
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '15px' }}>{s.title}</div>
                                            <div style={{ fontSize: '12px', opacity: 0.6, textTransform: 'uppercase' }}>{(s.target || 'all').replace('_', ' ')} • Order: {s.display_order}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <Badge
                                            label={s.is_active ? 'Visible' : 'Hidden'}
                                            variant={s.is_active ? 'success' : 'neutral'}
                                            showDot={s.is_active}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className={adminStyles.btnSecondary} style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => router.push(`/dashboard/admin/communications/spotlights/edit/${s.id}`)}>Edit</button>
                                        <button className={adminStyles.btnSecondary} style={{ padding: '6px 12px', fontSize: '12px', color: s.is_active ? 'var(--color-interface-error)' : 'var(--color-interface-success)' }} onClick={() => handleToggleSpotlight(s)}>
                                            {s.is_active ? 'Hide' : 'Show'}
                                        </button>
                                        <button className={adminStyles.btnSecondary} style={{ padding: '6px 12px', fontSize: '12px', color: '#ff4d4d' }} onClick={() => handleDeleteSpotlight(s.id)}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {spotlights.length === 0 && !isLoading && (
                                <div style={{ textAlign: 'center', padding: '16px 0', opacity: 0.5 }}>No spotlights configured yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB: BROADCAST ─── */}
            {activeTab === 'broadcast' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                    <TableToolbar searchPlaceholder="Search history..." searchValue={broadcastSearch} onSearchChange={setBroadcastSearch} />
                    <DataTable<BroadcastLog> data={filteredBroadcasts} columns={broadcastColumns} emptyMessage="No broadcast history found." isLoading={isLoading} />
                </div>
            )}

            {/* ─── TAB: SYSTEM BANNERS ─── */}
            {activeTab === 'banners' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                    <div className={adminStyles.pageCard}>
                        <h2 className={adminStyles.sectionTitle} style={{ marginBottom: '20px' }}>Active & Scheduled Banners</h2>

                        {liveBanner && (
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
                                        <Badge label={banner.type.toUpperCase()} variant={banner.type as 'info' | 'warning' | 'success' | 'error'} />
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
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {banners.length === 0 && !isLoading && (
                                <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5, border: '1px dashed var(--color-interface-outline)', borderRadius: '12px' }}>
                                    No banners configured or scheduled yet.
                                </div>
                            )}
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
