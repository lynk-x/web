"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import StatusFilterChips from '@/components/shared/StatusFilterChips';
import { useModerationAction } from '@/hooks/useModerationAction';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import CampaignTable, { Campaign } from '@/components/admin/campaigns/CampaignTable';
import EditCampaignModal from '@/components/admin/campaigns/EditCampaignModal';
import AdPricingTab from '@/components/admin/campaigns/AdPricingTab';
import AdCreditsTab from '@/components/admin/campaigns/AdCreditsTab';
import Link from 'next/link';

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import Modal from '@/components/shared/Modal';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import StatCard from '@/components/dashboard/StatCard';
import RejectionModal from '@/components/shared/RejectionModal';
import Tabs from '@/components/dashboard/Tabs';
import PageHeader from '@/components/dashboard/PageHeader';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { formatCurrency } from '@/utils/format';

function CampaignsContent() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const { executeAction } = useModerationAction();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const initialTab = (searchParams.get('tab') as string) || 'campaigns';
    const [activeTab, setActiveTab] = useState<'campaigns' | 'pricing' | 'credits'>(
        ['campaigns', 'pricing', 'credits'].includes(initialTab) ? initialTab as 'campaigns' | 'pricing' | 'credits' : 'campaigns'
    );
    
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [adTypeFilter, setAdTypeFilter] = useState('all');
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
        if (tab && ['campaigns', 'pricing', 'credits'].includes(tab)) {
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
    }, [debouncedSearch, statusFilter, adTypeFilter]);

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

                return supabase
                    .from('moderation')
                    .update({ status: isFlagging ? 'flagged' : 'pending_review' })
                    .eq('id', moderationId);
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
                .eq('id', campaignId);

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
                .delete()
                .eq('id', campaign.id);

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
            const { error } = await supabase.rpc('bulk_moderate_items', {
                p_moderation_ids: Array.from(selectedCampaignIds),
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
            const { error } = await supabase
                .from('ad_campaigns')
                .delete()
                .in('id', Array.from(selectedCampaignIds));

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
            <Tabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                options={[
                    { id: 'campaigns', label: 'Campaign List' },
                    { id: 'pricing', label: 'Ad Pricing Tiers' },
                    { id: 'credits', label: 'Ad Credits' }
                ]}
            />

            {activeTab === 'campaigns' && (
                <>
                    <div className={adminStyles.statsGrid}>
                        <StatCard 
                            label="Total Campaigns" 
                            value={summary?.total_campaigns || 0} 
                            isLoading={!summary} 
                        />
                        <StatCard 
                            label="Active Campaigns" 
                            value={summary?.active_campaigns || 0} 
                            change="Generating revenue"
                            trend="positive"
                            isLoading={!summary} 
                        />
                        <StatCard
                            label="Avg CTR"
                            value={campaignPerf?.avgCtr ?? '—'}
                            change="Across all banners"
                            trend="positive"
                            isLoading={!campaignPerf}
                        />
                        <StatCard
                            label="Avg CPC"
                            value={campaignPerf?.avgCpc ?? '—'}
                            change="Global baseline"
                            trend="neutral"
                            isLoading={!campaignPerf}
                        />
                    </div>

                    <TableToolbar
                        searchPlaceholder="Search campaigns or clients..."
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                    >
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <StatusFilterChips
                                options={[
                                    { value: 'all', label: 'All Status' },
                                    { value: 'active', label: 'Active' },
                                    { value: 'pending_approval', label: 'Pending' },
                                    { value: 'paused', label: 'Paused' },
                                    { value: 'rejected', label: 'Rejected' },
                                    { value: 'completed', label: 'Completed' },
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
                    </TableToolbar>

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

                    <RejectionModal
                        isOpen={isRejectionModalOpen}
                        onClose={() => setIsRejectionModalOpen(false)}
                        onConfirm={(reason) => {
                            const campaign = campaigns.find(c => c.id === pendingModerationItem?.id);
                            if (campaign) {
                                handleSingleStatusUpdate(campaign, pendingModerationItem?.status || 'rejected', reason);
                            }
                        }}
                        title={`Reject Campaign: ${pendingModerationItem?.title}`}
                    />

                    {/* ── Admin Moderation Modal ── */}
                    <Modal
                        isOpen={viewerConfig.isOpen}
                        onClose={() => setViewerConfig(prev => ({ ...prev, isOpen: false }))}
                        title={
                            viewerConfig.type === 'preview' ? `Preview Ad: ${viewerConfig.campaign?.name}` :
                            `Campaign Performance: ${viewerConfig.campaign?.name}`
                        }
                        size="medium"
                    >
                        {viewerConfig.type === 'preview' && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px' }}>
                                <div style={{ 
                                    width: '100%', 
                                    aspectRatio: viewerConfig.campaign?.adType === 'banner' ? '320/50' : '9/16',
                                    maxHeight: '400px',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden'
                                }}>
                                    {viewerConfig.mediaUrl ? (
                                        <img 
                                            src={viewerConfig.mediaUrl} 
                                            alt="Ad Creative" 
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                        />
                                    ) : (
                                        <div style={{ opacity: 0.5 }}>Loading creative...</div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{viewerConfig.campaign?.adType?.toUpperCase()} Ad</div>
                                    <div style={{ fontSize: '12px', opacity: 0.6 }}>Targeting: {viewerConfig.campaign?.client}</div>
                                </div>
                            </div>
                        )}

                        {viewerConfig.type === 'stats' && viewerConfig.campaign && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', padding: '20px' }}>
                                <StatCard label="Impressions" value={viewerConfig.campaign.impressions} trend="neutral" />
                                <StatCard label="Clicks" value={viewerConfig.campaign.clicks} trend="positive" />
                                <StatCard 
                                    label="CTR" 
                                    value={`${((viewerConfig.campaign.clicks / (viewerConfig.campaign.impressions || 1)) * 100).toFixed(2)}%`} 
                                    trend="positive" 
                                />
                                <StatCard label="Total Spend" value={formatCurrency(viewerConfig.campaign.spend)} trend="neutral" />
                            </div>
                        )}
                    </Modal>

                    <EditCampaignModal 
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        onSave={handleSaveCampaign}
                        campaign={editingCampaign}
                    />
                </>
            )}

            {activeTab === 'pricing' && <AdPricingTab />}
            {activeTab === 'credits' && <AdCreditsTab />}
        </>
    );
}

export default function AdminCampaignsPage() {
    return (
        <div className={styles.container}>
            <PageHeader
                title="Ad Campaign Moderation" 
                subtitle="Manage brand visibility and ad revenue distribution."
            />
            <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', opacity: 0.6 }}>Loading dashboard...</div>}>
                <CampaignsContent />
            </Suspense>
        </div>
    );
}
