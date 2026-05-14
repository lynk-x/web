"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import ContentTable, { ContentItem } from '@/components/admin/content/ContentTable';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { LegalDocument, SystemBanner, BroadcastLog, Spotlight } from '@/types/admin';
import { Tabs, TabsList, TabsTrigger } from '@/components/shared/Tabs';
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

    const initialTab = (searchParams.get('tab') as string) || 'broadcast';
    const [activeTab, setActiveTab] = useState<'content' | 'broadcast' | 'legal' | 'banners' | 'spotlights'>(
        ['content', 'broadcast', 'legal', 'banners', 'spotlights'].includes(initialTab) ? initialTab as 'content' | 'broadcast' | 'legal' | 'banners' | 'spotlights' : 'broadcast'
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
            const cmsParams = {
                search: searchTerm,
                type: typeFilter,
                status: statusFilter,
                offset: (currentPage - 1) * itemsPerPage,
                limit: itemsPerPage
            };

            const legalParams = {
                offset: (legalDocPage - 1) * legalDocsPerPage,
                limit: legalDocsPerPage
            };

            const [spotlightsRes, broadcastRes, bannerRes, contentRes, legalRes] = await Promise.all([
                supabase.rpc('get_admin_comms_data', { p_tab: 'spotlights' }),
                supabase.rpc('get_admin_comms_data', { p_tab: 'broadcast', p_params: { search: searchTerm } }),
                supabase.rpc('get_admin_comms_data', { p_tab: 'banners' }),
                supabase.rpc('get_admin_comms_data', { p_tab: 'content', p_params: cmsParams }),
                supabase.rpc('get_admin_comms_data', { p_tab: 'legal', p_params: legalParams })
            ]);

            if (contentRes.data) {
                setContents((contentRes.data.items || []).map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    slug: item.slug,
                    type: item.type,
                    author: 'System',
                    lastUpdated: new Date(item.updated_at).toLocaleDateString(),
                    status: item.status,
                    content: ''
                })));
                setContentTotal(contentRes.data.total || 0);
            }

            if (legalRes.data) {
                setLegalDocs(legalRes.data.items || []);
                setLegalTotal(legalRes.data.total || 0);
            }

            if (broadcastRes.data) setBroadcastLogs(broadcastRes.data);
            if (bannerRes.data) setBanners(bannerRes.data);
            if (spotlightsRes.data) setSpotlights(spotlightsRes.data);

        } catch (error) {
            showToast('Failed to load some data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, currentPage, itemsPerPage, legalDocPage, legalDocsPerPage, searchTerm, typeFilter, statusFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Fetch platform-wide published pages count once
    useEffect(() => {
        supabase.rpc('get_admin_comms_data', { p_tab: 'content', p_params: { status: 'published', limit: 1 } })
            .then(({ data }) => { if (data?.total !== undefined) setPublishedPagesCount(data.total); });
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
            const { error } = await supabase.rpc('admin_manage_comms_item', {
                p_tab: 'legal',
                p_action: 'toggle',
                p_id: doc.id,
                p_params: { is_active: !doc.is_active }
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
                // Handle deletion one by one or add a bulk delete RPC if needed. 
                // For now, let's use the manage RPC in a loop or implement bulk delete in backend.
                // Hardening: Moving to secure RPC for all deletions.
                for (const id of ids) {
                    await supabase.rpc('admin_manage_comms_item', { p_tab: 'content', p_action: 'delete', p_id: id });
                }
            } else {
                await supabase.rpc('admin_manage_comms_item', {
                    p_tab: 'content',
                    p_action: 'bulk_status',
                    p_id: '00000000-0000-0000-0000-000000000000', // Placeholder for bulk
                    p_params: { ids, status: action === 'publish' ? 'published' : 'archived' }
                });
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
            header: 'Date Sent',
            render: (log) => (
                <div style={{ fontSize: '13px', opacity: 0.7 }}>
                    {new Date(log.created_at).toLocaleDateString()}
                </div>
            ),
        },
    ];

    const spotlightColumns: Column<Spotlight>[] = [
        {
            header: 'Hero Content',
            render: (s) => (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {s.background_url && (
                        <div style={{ width: '60px', height: '36px', borderRadius: '4px', background: `url(${s.background_url}) no-repeat center`, backgroundSize: 'cover' }} />
                    )}
                    <div>
                        <div style={{ fontWeight: 600 }}>{s.title}</div>
                        <div style={{ fontSize: '12px', opacity: 0.6 }}>Order: {s.display_order}</div>
                    </div>
                </div>
            ),
        },
        {
            header: 'Target Segment',
            render: (s) => <Badge label={(s.target || 'all').replace('_', ' ')} variant="neutral" />,
        },
        {
            header: 'Status',
            render: (s) => (
                <Badge
                    label={s.is_active ? 'Visible' : 'Hidden'}
                    variant={s.is_active ? 'success' : 'neutral'}
                    showDot={s.is_active}
                />
            ),
        },
        {
            header: 'Actions',
            render: (s) => (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className={adminStyles.btnSecondary} style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => router.push(`/dashboard/admin/communications/spotlights/edit/${s.id}`)}>Edit</button>
                    <button className={adminStyles.btnSecondary} style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleToggleSpotlight(s)}>
                        {s.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button className={adminStyles.btnSecondary} style={{ padding: '6px 12px', fontSize: '12px', color: '#ff4d4d' }} onClick={() => handleDeleteSpotlight(s.id)}>
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    const bannerColumns: Column<SystemBanner>[] = [
        {
            header: 'Banner Info',
            render: (banner) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{banner.title}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>
                        {new Date(banner.starts_at).toLocaleDateString()} {banner.ends_at ? `- ${new Date(banner.ends_at).toLocaleDateString()}` : '(Ongoing)'}
                    </div>
                </div>
            ),
        },
        {
            header: 'Visual Type',
            render: (banner) => <Badge label={banner.type.toUpperCase()} variant={banner.type as any} />,
        },
        {
            header: 'Status',
            render: (banner) => (
                <Badge
                    label={banner.is_active ? 'Live' : 'Inactive'}
                    variant={banner.is_active ? 'success' : 'neutral'}
                    showDot={banner.is_active}
                />
            ),
        },
        {
            header: 'Actions',
            render: (banner) => (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className={adminStyles.btnSecondary} style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => router.push(`/dashboard/admin/communications/banners/edit/${banner.id}`)}>Edit</button>
                    <button className={adminStyles.btnSecondary} style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleToggleBanner(banner)}>
                        {banner.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className={adminStyles.btnSecondary} style={{ padding: '6px 12px', fontSize: '12px', color: '#ff4d4d' }} onClick={() => handleDeleteBanner(banner.id)}>
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    // ─── Banner Logic ───
    const liveBanner = banners.find(b => b.is_active);

    const handleToggleBanner = async (banner: SystemBanner) => {
        try {
            const { error } = await supabase.rpc('admin_manage_comms_item', {
                p_tab: 'banners',
                p_action: 'toggle',
                p_id: banner.id,
                p_params: { is_active: !banner.is_active }
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
            const { error } = await supabase.rpc('admin_manage_comms_item', {
                p_tab: 'banners',
                p_action: 'delete',
                p_id: id
            });
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
            const { error } = await supabase.rpc('admin_manage_comms_item', {
                p_tab: 'spotlights',
                p_action: 'toggle',
                p_id: spotlight.id,
                p_params: { is_active: !spotlight.is_active }
            });
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
            const { error } = await supabase.rpc('admin_manage_comms_item', {
                p_tab: 'spotlights',
                p_action: 'delete',
                p_id: id
            });
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
            <header className={adminStyles.header}>
                <div>
                    <h1 className={adminStyles.title}>Communications</h1>
                    <p className={adminStyles.subtitle}>Manage platform content, spotlights and notifications.</p>
                </div>
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

            <div style={{ marginBottom: '24px' }}>
                <TableToolbar
                    searchPlaceholder={
                        activeTab === 'content' ? "Search by title or slug..." :
                            activeTab === 'broadcast' ? "Search history..." :
                                "Search content..."
                    }
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                >
                    <button
                        className={adminStyles.btnPrimary}
                        onClick={() => {
                            if (activeTab === 'spotlights') router.push('/dashboard/admin/communications/spotlights/new');
                            else if (activeTab === 'content') router.push('/dashboard/admin/communications/create');
                            else if (activeTab === 'legal') router.push('/dashboard/admin/communications/legal/new');
                            else if (activeTab === 'broadcast') router.push('/dashboard/admin/communications/broadcast/create');
                            else router.push('/dashboard/admin/communications/banners/create');
                        }}
                        style={{ whiteSpace: 'nowrap' }}
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
                </TableToolbar>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className={adminStyles.tabsHeaderRow} style={{ borderBottom: 'none' }}>
                    <TabsList>
                        <TabsTrigger value="broadcast">Broadcasts</TabsTrigger>
                        <TabsTrigger value="spotlights">Spotlights</TabsTrigger>
                        <TabsTrigger value="banners">Alert Banners</TabsTrigger>
                        <TabsTrigger value="content">Info Pages</TabsTrigger>
                        <TabsTrigger value="legal">Legals</TabsTrigger>
                    </TabsList>

                    {activeTab === 'content' && (
                        <div className={adminStyles.filterGroup} style={{ marginBottom: 0 }}>
                            {['all', 'page', 'post', 'announcement'].map(type => (
                                <button key={type} className={`${adminStyles.chip} ${typeFilter === type ? adminStyles.chipActive : ''}`} onClick={() => setTypeFilter(type)}>
                                    {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── TAB: SPOTLIGHTS ─── */}
                {activeTab === 'spotlights' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                        <DataTable<Spotlight> data={spotlights} columns={spotlightColumns} emptyMessage="No spotlights configured yet." isLoading={isLoading} />
                    </div>
                )}

                {/* ─── TAB: BROADCAST ─── */}
                {activeTab === 'broadcast' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                        <DataTable<BroadcastLog> data={broadcastLogs} columns={broadcastColumns} emptyMessage="No broadcast history found." isLoading={isLoading} />
                    </div>
                )}

            {/* ─── TAB: SYSTEM BANNERS ─── */}
            {activeTab === 'banners' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                    {liveBanner && (
                        <div className={adminStyles.pageCard} style={{ padding: '16px', border: '1px solid var(--color-interface-outline)', background: 'rgba(255, 255, 255, 0.02)' }}>
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
                    <DataTable<SystemBanner> data={banners} columns={bannerColumns} emptyMessage="No banners configured yet." isLoading={isLoading} />
                </div>
            )}


            {activeTab === 'content' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>

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
                </div>
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
            </Tabs>
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
