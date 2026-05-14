"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import FilterChips from '@/components/shared/FilterChips';
import { useModerationAction } from '@/hooks/useModerationAction';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import CampaignTable, { Campaign } from '@/components/admin/campaigns/CampaignTable';
import EditCampaignModal from '@/components/admin/campaigns/EditCampaignModal';
import AdCreditsTab from '@/components/admin/campaigns/AdCreditsTab';
import Link from 'next/link';
import CreateCampaignDrawer from '@/components/admin/campaigns/CreateCampaignDrawer';

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import Modal from '@/components/shared/Modal';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import StatCard from '@/components/dashboard/StatCard';
import RejectionModal from '@/components/shared/RejectionModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import PageHeader from '@/components/dashboard/PageHeader';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { formatCurrency } from '@/utils/format';
import DateRangeRow from '@/components/shared/DateRangeRow';

function CampaignsContent() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const { executeAction } = useModerationAction();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const initialTab = (searchParams.get('tab') as string) || 'campaigns';
    const [activeTab, setActiveTab] = useState<'campaigns' | 'credits'>(
        ['campaigns', 'credits'].includes(initialTab) ? initialTab as 'campaigns' | 'credits' : 'campaigns'
    );
    
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [adTypeFilter, setAdTypeFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [summary, setSummary] = useState<any>(null);
    const [campaignPerf, setCampaignPerf] = useState<{ avgCtr: string; avgCpc: string } | null>(null);

    const [viewerConfig, setViewerConfig] = useState<{
        isOpen: boolean;
        type: 'preview' | 'stats' | 'none';
        campaign: Campaign | null;
        mediaUrl?: string;
    }>({ isOpen: false, type: 'none', campaign: null });

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

    const debouncedSearch = useDebounce(searchTerm, 500);
    const itemsPerPage = 10;

    const fetchDashboardSummary = useCallback(async () => {
        const { data, error } = await supabase.rpc('admin_stat_summary');
        if (!error && data) {
            setSummary(data);
        }
    }, [supabase]);

    const fetchCampaignPerf = useCallback(async () => {
        const { data, error } = await supabase.rpc('get_admin_ad_performance');

        if (!error && data) {
            setCampaignPerf({
                avgCtr: `${data.avg_ctr}%`,
                avgCpc: `$${data.avg_cpc}`
            });
        }
    }, [supabase]);

    useEffect(() => {
        const tab = searchParams.get('tab') as string;
        if (tab && ['campaigns', 'credits'].includes(tab)) {
            setActiveTab(tab as typeof activeTab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        const tab = newTab as typeof activeTab;
        setActiveTab(tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const fetchCampaigns = useCallback(async () => {
        if (activeTab !== 'campaigns') return;
        
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_campaigns', {
                p_search: debouncedSearch,
                p_status: statusFilter,
                p_type: adTypeFilter,
                p_offset: (currentPage - 1) * itemsPerPage,
                p_limit: itemsPerPage
            });

            if (error) throw error;
            const total = data?.[0]?.total_count || 0;
            setTotalCount(total);

            setCampaigns((data || []).map((c: any) => ({
                id: c.id,
                createdAt: c.created_at,
                campaignRef: c.reference || `CAM-${c.id.slice(0, 8).toUpperCase()}`,
                name: c.title,
                client: c.account_name,
                adType: c.type,
                budget: parseFloat(c.total_budget),
                spend: parseFloat(c.spent_amount) || 0,
                impressions: parseInt(c.total_impressions) || 0,
                clicks: parseInt(c.total_clicks) || 0,
                status: c.status,
                startDate: new Date(c.start_at).toLocaleDateString(),
                endDate: new Date(c.end_at).toLocaleDateString(),
                moderationId: c.moderation_id
            })));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load campaigns.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, debouncedSearch, statusFilter, adTypeFilter, currentPage, activeTab, showToast]);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    useEffect(() => {
        fetchDashboardSummary();
        fetchCampaignPerf();
    }, [fetchDashboardSummary, fetchCampaignPerf]);

    // Reset page on search/filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, statusFilter, adTypeFilter, startDate, endDate]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [pendingModerationItem, setPendingModerationItem] = useState<{ id: string, moderationId?: string, title: string, status: string } | null>(null);

    const handleSingleStatusUpdate = async (campaign: Campaign, newStatus: string, reason?: string) => {
        // If it's a rejection, we need the modal first.
        if (newStatus === 'rejected' && !reason) {
            setPendingModerationItem({ id: campaign.id, moderationId: campaign.moderationId, title: campaign.name, status: newStatus });
            setIsRejectionModalOpen(true);
            return;
        }

        await executeAction(
            () => {
                const moderationId = campaign.moderationId;
                if (!moderationId) throw new Error(`No moderation record found for ${campaign.name}.`);

                return supabase.rpc('moderate_item', {
                    p_moderation_id: moderationId,
                    p_status: newStatus === 'active' ? 'approved' : 'rejected',
                    p_reason: reason || 'Status updated via Admin Campaigns dashboard.'
                });
            },
            {
                loadingMessage: `Updating ${campaign.name} to ${newStatus}...`,
                successMessage: `${campaign.name} updated`,
                onSuccess: () => {
                    fetchCampaigns();
                    fetchDashboardSummary();
                    setIsRejectionModalOpen(false);
                }
            }
        );
    };

    const handleFlag = async (campaign: Campaign) => {
        const isFlagging = !campaign.isFlagged;
        await executeAction(
            () => {
                const moderationId = campaign.moderationId;
                if (!moderationId) throw new Error('Moderation record missing.');

                return supabase.rpc('moderate_item', {
                    p_moderation_id: moderationId,
                    p_status: isFlagging ? 'flagged' : 'pending_review',
                    p_reason: `${isFlagging ? 'Flagged' : 'Unflagged'} via Admin Campaigns dashboard.`
                });
            },
            {
                loadingMessage: `${isFlagging ? 'Flagging' : 'Unflagging'} ${campaign.name}...`,
                successMessage: `${campaign.name} flag updated`,
                onSuccess: fetchCampaigns
            }
        );
    };

    const handlePreview = async (campaign: Campaign) => {
        setViewerConfig({ isOpen: true, type: 'preview', campaign, mediaUrl: undefined });
        
        const { data, error } = await supabase
            .from('ad_media')
            .select('url')
            .eq('campaign_id', campaign.id)
            .limit(1)
            .single();

        if (!error && data) {
            setViewerConfig(prev => ({ ...prev, mediaUrl: data.url }));
        }
    };

    const handleViewStats = (campaign: Campaign) => {
        setViewerConfig({ isOpen: true, type: 'stats', campaign });
    };

    const handleEdit = (campaign: Campaign) => {
        setEditingCampaign(campaign);
        setIsEditModalOpen(true);
    };

    const handleSaveCampaign = async (campaignId: string, updates: any) => {
        showToast(`Saving changes...`, 'info');
        try {
            const { error } = await supabase
                .from('ad_campaigns')
                .update({
                    title: updates.name,
                    total_budget: updates.budget,
                    start_at: updates.startDate,
                    end_at: updates.endDate,
                    updated_at: new Date().toISOString()
                })
                .eq('id', campaignId)
                .eq('created_at', editingCampaign?.createdAt);

            if (error) throw error;

            showToast(`Campaign updated successfully.`, 'success');
            setIsEditModalOpen(false);
            fetchCampaigns();
        } catch (err) {
            showToast('Failed to update campaign.', 'error');
        }
    };

    const handleSingleDelete = async (campaign: Campaign) => {
        if (!await confirm(`Are you sure you want to delete ${campaign.name}?`)) return;
        showToast(`Deleting ${campaign.name}...`, 'info');
        try {
            const { error } = await supabase
                .from('ad_campaigns')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', campaign.id)
                .eq('created_at', campaign.createdAt);

            if (error) throw error;

            showToast(`${campaign.name} deleted.`, 'success');
            fetchCampaigns();
            fetchDashboardSummary();
        } catch (err) {
            showToast('Failed to delete campaign.', 'error');
        }
    };

    const handleBulkStatusUpdate = async (newStatus: string) => {
        showToast(`Updating ${selectedCampaignIds.size} campaigns to ${newStatus}...`, 'info');

        try {
            const moderationIds = campaigns
                .filter(c => selectedCampaignIds.has(c.id) && c.moderationId)
                .map(c => c.moderationId);

            if (moderationIds.length === 0) {
                showToast('No campaigns with moderation records found.', 'error');
                return;
            }

            const { error } = await supabase.rpc('bulk_moderate_items', {
                p_moderation_ids: moderationIds,
                p_status: newStatus === 'active' ? 'approved' : 'rejected',
                p_reason: `Bulk status update to ${newStatus} via Admin Dashboard.`
            });

            if (error) throw error;

            showToast(`Successfully moved ${selectedCampaignIds.size} campaigns to ${newStatus}.`, 'success');
            fetchCampaigns();
            fetchDashboardSummary();
            setSelectedCampaignIds(new Set());
        } catch (err) {
            showToast('Failed to update campaign status.', 'error');
        }
    };

    const handleBulkDelete = async () => {
        if (!await confirm(`Are you sure you want to delete ${selectedCampaignIds.size} campaigns?`)) return;
        showToast(`Deleting ${selectedCampaignIds.size} campaigns...`, 'info');

        try {
            const { error } = await supabase.rpc('bulk_delete_campaigns', {
                p_ids: Array.from(selectedCampaignIds),
                p_created_ats: campaigns
                    .filter(c => selectedCampaignIds.has(c.id))
                    .map(c => c.createdAt)
            });

            if (error) throw error;

            showToast(`Successfully deleted ${selectedCampaignIds.size} campaigns.`, 'success');
            fetchCampaigns();
            fetchDashboardSummary();
            setSelectedCampaignIds(new Set());
        } catch (err) {
            showToast('Failed to delete campaigns.', 'error');
        }
    };

    const handleSelectCampaign = (id: string) => {
        const newSelected = new Set(selectedCampaignIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedCampaignIds(newSelected);
    };

    const handleSelectAll = (ids: string[]) => {
        if (selectedCampaignIds.size === ids.length) {
            setSelectedCampaignIds(new Set());
        } else {
            setSelectedCampaignIds(new Set(ids));
        }
    };

    const bulkActions: BulkAction[] = [
        { label: 'Approve Selected', onClick: () => handleBulkStatusUpdate('active'), variant: 'success' },
        { label: 'Reject Selected', onClick: () => handleBulkStatusUpdate('rejected'), variant: 'danger' },
        { label: 'Delete Selected', onClick: handleBulkDelete, variant: 'danger' }
    ];

    return (
        <>
            {ConfirmDialog}
            <PageHeader
                title="Ad Campaign Moderation" 
                subtitle="Manage brand visibility and ad revenue distribution."
                actionLabel="+ Create Campaign"
                onActionClick={() => setIsCreateDrawerOpen(true)}
            />
            
            <div className={adminStyles.statsGrid} style={{ marginBottom: 'var(--spacing-xs)' }}>
                <StatCard 
                    label="Active Campaigns" 
                    value={summary?.advertising?.active_campaigns || 0} 
                    change="Platform reach"
                    trend="positive"
                    isLoading={!summary} 
                />
                <StatCard 
                    label="Ad Revenue (30d)" 
                    value={summary?.advertising?.spend_30d !== undefined ? formatCurrency(summary.advertising.spend_30d) : '—'} 
                    change="Net proceeds"
                    trend="positive"
                    isLoading={!summary} 
                />
                <StatCard
                    label="Credit Liability"
                    value={summary?.advertising?.outstanding_credits !== undefined ? formatCurrency(summary.advertising.outstanding_credits) : '—'}
                    change="Outstanding grants"
                    trend="neutral"
                    isLoading={!summary}
                />
                <StatCard
                    label="Avg CTR"
                    value={campaignPerf?.avgCtr ?? '—'}
                    change="Engagement rate"
                    trend="positive"
                    isLoading={!campaignPerf}
                />
            </div>

            <TableToolbar
                searchPlaceholder={
                    activeTab === 'credits' ? "Search by advertiser..." : "Search campaigns or clients..."
                }
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <DateRangeRow 
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onClear={() => {
                        setStartDate('');
                        setEndDate('');
                    }}
                />
            </TableToolbar>

            <Tabs value={activeTab} onValueChange={(id) => handleTabChange(id)} className={styles.tabsReset}>
                <div className={adminStyles.tabsHeaderRow}>
                    <TabsList>
                        <TabsTrigger value="campaigns">Ad Campaigns</TabsTrigger>
                        <TabsTrigger value="credits">Ad Credits</TabsTrigger>
                    </TabsList>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activeTab === 'campaigns' && (
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <FilterChips
                                    options={[
                                        { value: 'all', label: 'All Status' },
                                        { value: 'active', label: 'Active' },
                                        { value: 'pending_approval', label: 'Pending' },
                                        { value: 'paused', label: 'Paused' },
                                        { value: 'rejected', label: 'Rejected' },
                                        { value: 'completed', label: 'Completed' },
                                        { value: 'scheduled', label: 'Scheduled' },
                                    ]}
                                    currentValue={statusFilter}
                                    onChange={setStatusFilter}
                                />
                                <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-interface-outline)', opacity: 0.3, margin: '0 4px' }} />
                                <select 
                                    className={adminStyles.filterSelect}
                                    value={adTypeFilter}
                                    onChange={(e) => setAdTypeFilter(e.target.value)}
                                >
                                    <option value="all">All Types</option>
                                    <option value="banner">Banner</option>
                                    <option value="interstitial">Interstitial</option>
                                </select>
                            </div>
                        )}
                        {activeTab === 'credits' && (
                            <button
                                className={adminStyles.btnPrimary}
                                onClick={() => setIsIssueModalOpen(true)}
                                style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
                            >
                                + Issue Credit
                            </button>
                        )}
                    </div>
                </div>

                <TabsContent value="campaigns">
                    <BulkActionsBar
                        selectedCount={selectedCampaignIds.size}
                        actions={bulkActions}
                        onCancel={() => setSelectedCampaignIds(new Set())}
                        itemTypeLabel="campaigns"
                    />

                    <CampaignTable
                        campaigns={campaigns}
                        selectedIds={selectedCampaignIds}
                        onSelect={handleSelectCampaign}
                        onSelectAll={() => handleSelectAll(campaigns.map(c => c.id))}
                        onStatusChange={handleSingleStatusUpdate}
                        onDelete={handleSingleDelete}
                        onPreview={handlePreview}
                        onViewStats={handleViewStats}
                        onFlag={handleFlag}
                        onEdit={handleEdit}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </TabsContent>


                <TabsContent value="credits">
                    <AdCreditsTab 
                        hideToolbar 
                        isIssueModalOpen={isIssueModalOpen}
                        setIsIssueModalOpen={setIsIssueModalOpen}
                        searchTerm={searchTerm}
                    />
                </TabsContent>
            </Tabs>

            <CreateCampaignDrawer 
                isOpen={isCreateDrawerOpen}
                onClose={() => setIsCreateDrawerOpen(false)}
                onSuccess={() => {
                    fetchCampaigns();
                    fetchDashboardSummary();
                }}
            />
        </>
    );
}

export default function AdminCampaignsPage() {
    return (
        <div className={styles.container}>
            <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', opacity: 0.6 }}>Loading dashboard...</div>}>
                <CampaignsContent />
            </Suspense>
        </div>
    );
}
