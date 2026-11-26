"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import FilterChips from '@/components/shared/FilterChips';
import { useModerationAction } from '@/hooks/useModerationAction';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import CampaignTable, { Campaign } from '@/components/admin/campaigns/CampaignTable';
import AdAnalyticsTab from '@/components/admin/campaigns/AdAnalyticsTab';
import { useOrganization } from '@/context/OrganizationContext';

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import StatCard from '@/components/dashboard/StatCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import PageHeader from '@/components/dashboard/PageHeader';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { useResponsivePageSize } from '@/hooks/useResponsivePageSize';
import { usePagination } from '@/hooks/usePagination';
import { useResolvedCountryFilter } from '@/hooks/useResolvedCountryFilter';
import DateRangeRow from '@/components/shared/DateRangeRow';
import { useUrlTab } from '@/hooks/useUrlTab';

function CampaignsContent() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    useModerationAction();
    const { activeAccount } = useOrganization();

    const resolvedCountryFilter = useResolvedCountryFilter(activeAccount);

    const [activeTab, handleTabChange] = useUrlTab('tab', 'campaigns', { validValues: ['campaigns', 'analytics'] }) as [
        'campaigns' | 'analytics',
        (value: 'campaigns' | 'analytics') => void
    ];

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [adTypeFilter, setAdTypeFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
    const [summary, setSummary] = useState<{
        total?: number;
        total_30d?: number;
        active?: number;
        active_30d?: number;
        pending?: number;
        flagged?: number;
        total_budget?: number;
        total_spend?: number;
        total_impressions?: number;
        total_clicks?: number;
    } | null>(null);
    const [, setCampaignPerf] = useState<{ avgCtr: string; avgCpc: string } | null>(null);

    const debouncedSearch = useDebounce(searchTerm, 500);
    const itemsPerPage = useResponsivePageSize({ chromeHeight: 560 });
    const { currentPage, setCurrentPage, totalCount, setTotalCount } = usePagination(
        itemsPerPage,
        [debouncedSearch, statusFilter, adTypeFilter, startDate, endDate, itemsPerPage]
    );

    const fetchDashboardSummary = useCallback(async () => {
        const { data, error } = await supabase.schema('api').rpc('get_advertising_stat_summary', {
            p_country_code: resolvedCountryFilter
        });
        if (!error && data) {
            setSummary(data);
        }
    }, [supabase, resolvedCountryFilter]);

    const fetchCampaignPerf = useCallback(async () => {
        const { data, error } = await supabase.schema('api').rpc('get_admin_campaign_performance', {
            p_country_code: resolvedCountryFilter
        });

        if (!error && data) {
            setCampaignPerf({
                avgCtr: `${data.avg_ctr}%`,
                avgCpc: `$${data.avg_cpc}`
            });
        }
    }, [supabase, resolvedCountryFilter]);

    const fetchCampaigns = useCallback(async () => {
        if (activeTab !== 'campaigns') return;
        
        setIsLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('get_admin_campaigns', {
                p_search: debouncedSearch,
                p_status: statusFilter,
                p_type: adTypeFilter,
                p_country_code: resolvedCountryFilter,
                p_offset: (currentPage - 1) * itemsPerPage,
                p_limit: itemsPerPage
            });

            if (error) throw error;
            const total = data?.[0]?.total_count || 0;
            setTotalCount(total);

            setCampaigns((data || []).map((c: {
                id: string;
                created_at: string;
                reference?: string | null;
                title: string;
                account_name: string;
                type: Campaign['adType'];
                total_budget: string;
                spent_amount?: string | null;
                currency?: string | null;
                total_impressions?: string | null;
                total_clicks?: string | null;
                status: Campaign['status'];
                start_at: string;
                end_at: string;
                moderation_id?: string | null;
            }) => ({
                id: c.id,
                createdAt: c.created_at,
                campaignRef: c.reference || `CAM-${c.id.slice(0, 8).toUpperCase()}`,
                name: c.title,
                client: c.account_name,
                adType: c.type,
                budget: parseFloat(c.total_budget),
                spend: parseFloat(c.spent_amount || '0') || 0,
                currency: c.currency || 'USD',
                impressions: parseInt(c.total_impressions || '0', 10) || 0,
                clicks: parseInt(c.total_clicks || '0', 10) || 0,
                status: c.status,
                startDate: new Date(c.start_at).toLocaleDateString(),
                endDate: new Date(c.end_at).toLocaleDateString(),
                moderationId: c.moderation_id ?? undefined
            })));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load campaigns.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, debouncedSearch, statusFilter, adTypeFilter, resolvedCountryFilter, currentPage, itemsPerPage, activeTab, showToast, setTotalCount]);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    useEffect(() => {
        fetchDashboardSummary();
        fetchCampaignPerf();
    }, [fetchDashboardSummary, fetchCampaignPerf]);

    const handleBulkStatusUpdate = async (newStatus: string) => {
        showToast(`Updating ${selectedCampaignIds.size} campaigns to ${newStatus}...`, 'info');

        try {
            const selectedCampaigns = campaigns.filter(c => selectedCampaignIds.has(c.id));
            const withModeration = selectedCampaigns.filter(c => c.moderationId);
            const withoutModeration = selectedCampaigns.filter(c => !c.moderationId);

            if (withModeration.length > 0) {
                const { error } = await supabase.schema('api').rpc('bulk_moderate_items', {
                    p_moderation_ids: withModeration.map(c => c.moderationId),
                    p_status: newStatus === 'active' ? 'approved' : 'rejected',
                    p_reason: `Bulk status update to ${newStatus} via Admin Dashboard.`
                });

                if (error) throw error;
            }

            if (withoutModeration.length > 0) {
                for (const campaign of withoutModeration) {
                    const { error } = await supabase
                        .schema('api')
                        .from('v1_campaigns')
                        .update({ status: newStatus, updated_at: new Date().toISOString() })
                        .eq('id', campaign.id)
                        .eq('created_at', campaign.createdAt);

                    if (error) throw error;
                }
            }

            const totalUpdated = withModeration.length + withoutModeration.length;
            showToast(`Successfully moved ${totalUpdated} campaigns to ${newStatus}.`, 'success');
            fetchCampaigns();
            fetchDashboardSummary();
            setSelectedCampaignIds(new Set());
        } catch {
            showToast('Failed to update campaign status.', 'error');
        }
    };

    const handleBulkDelete = async () => {
        if (!await confirm(`Are you sure you want to delete ${selectedCampaignIds.size} campaigns?`)) return;
        showToast(`Deleting ${selectedCampaignIds.size} campaigns...`, 'info');

        try {
            const { error } = await supabase.schema('api').rpc('admin_bulk_delete_campaigns', {
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
        } catch {
            showToast('Failed to delete campaigns.', 'error');
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
                title="Campaign Moderation" 
                subtitle="Manage advertiser visibility and campaign revenue distribution."
                actionLabel="+ Create Campaign"
                actionHref="/dashboard/admin/campaigns/create"
            />
            
            <div className={adminStyles.statsGrid} style={{ marginBottom: 'var(--spacing-xs)' }}>
                <StatCard 
                    label="Total Campaigns (30d)" 
                    value={summary?.total_30d ?? 0} 
                    change="Volume created"
                    trend="neutral"
                    isLoading={!summary} 
                />
                <StatCard 
                    label="Active Campaigns (30d)" 
                    value={summary?.active_30d ?? 0} 
                    change="Active engagement"
                    trend="positive"
                    isLoading={!summary} 
                />
                <StatCard
                    label="Pending Review"
                    value={summary?.pending ?? 0}
                    change="Awaiting approval"
                    trend="neutral"
                    isLoading={!summary}
                />
                <StatCard
                    label="Flagged Campaigns"
                    value={summary?.flagged ?? 0}
                    change="Compliance violations"
                    trend="negative"
                    isLoading={!summary}
                />
            </div>

            <TableToolbar
                searchPlaceholder={
                    activeTab === 'analytics' ? "Search by advertiser..." : "Search campaigns or clients..."
                }
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                {activeTab === 'campaigns' && (
                    <select
                        className={adminStyles.filterSelect}
                        value={adTypeFilter}
                        onChange={(e) => setAdTypeFilter(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="banner">Banner</option>
                        <option value="interstitial">Interstitial</option>
                    </select>
                )}
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

            <Tabs value={activeTab} onValueChange={(id) => handleTabChange(id as 'campaigns' | 'analytics')} className={styles.tabsReset}>
                <div className={adminStyles.tabsHeaderRow}>
                    <TabsList>
                        <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                        <TabsTrigger value="analytics">Impressions</TabsTrigger>
                    </TabsList>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activeTab === 'campaigns' && (
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
                        onSelect={(id) => {
                            const next = new Set(selectedCampaignIds);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            setSelectedCampaignIds(next);
                        }}
                        onSelectAll={() => setSelectedCampaignIds(selectedCampaignIds.size === campaigns.length ? new Set() : new Set(campaigns.map(c => c.id)))}
                        currentPage={currentPage}
                        totalPages={Math.ceil(totalCount / itemsPerPage)}
                        onPageChange={setCurrentPage}
                    />
                </TabsContent>

                <TabsContent value="analytics">
                    <AdAnalyticsTab search={debouncedSearch} countryCode={resolvedCountryFilter} />
                </TabsContent>
            </Tabs>

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
