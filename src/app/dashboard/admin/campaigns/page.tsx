"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import CampaignTable, { Campaign } from '@/components/admin/campaigns/CampaignTable';
import AdAssetsTab from '@/components/admin/campaigns/AdAssetsTab';
import AdAnalyticsTab from '@/components/admin/campaigns/AdAnalyticsTab';
import AdPricingTab from '@/components/admin/campaigns/AdPricingTab';
import Link from 'next/link';

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import StatCard from '@/components/dashboard/StatCard';
import RejectionModal from '@/components/shared/RejectionModal';
import Tabs from '@/components/dashboard/Tabs';
import PageHeader from '@/components/dashboard/PageHeader';
import { useDebounce } from '@/hooks/useDebounce';

function CampaignsContent() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const initialTab = (searchParams.get('tab') as string) || 'campaigns';
    const [activeTab, setActiveTab] = useState<'campaigns' | 'assets' | 'analytics' | 'pricing'>(
        ['campaigns', 'assets', 'analytics', 'pricing'].includes(initialTab) ? initialTab as 'campaigns' | 'assets' | 'analytics' | 'pricing' : 'campaigns'
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

    const debouncedSearch = useDebounce(searchTerm, 500);
    const itemsPerPage = 10;

    const fetchDashboardSummary = useCallback(async () => {
        const { data, error } = await supabase.rpc('admin_stat_summary');
        if (!error && data) {
            setSummary(data);
        }
    }, [supabase]);

    const fetchCampaignPerf = useCallback(async () => {
        const { data } = await supabase
            .schema('analytics')
            .from('mv_ad_campaign_performance')
            .select('click_through_rate_pct, cost_per_click');

        if (data && data.length > 0) {
            const avgCtr = data.reduce((sum: number, r: any) => sum + (parseFloat(r.click_through_rate_pct) || 0), 0) / data.length;
            const avgCpc = data.reduce((sum: number, r: any) => sum + (parseFloat(r.cost_per_click) || 0), 0) / data.length;
            setCampaignPerf({
                avgCtr: `${avgCtr.toFixed(1)}%`,
                avgCpc: `$${avgCpc.toFixed(2)}`
            });
        }
    }, [supabase]);

    useEffect(() => {
        const tab = searchParams.get('tab') as string;
        if (tab && ['campaigns', 'assets', 'analytics', 'pricing'].includes(tab)) {
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
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            let query = supabase
                .from('ad_campaigns')
                .select(`
                    *,
                    accounts!account_id(display_name)
                `, { count: 'exact' });

            // Server-Side Filtering
            if (debouncedSearch) {
                query = query.ilike('title', `%${debouncedSearch}%`);
            }
            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }
            if (adTypeFilter !== 'all') {
                query = query.eq('type', adTypeFilter);
            }

            // Server-Side Pagination
            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            setTotalCount(count || 0);
            setCampaigns((data || []).map((c: any) => ({
                id: c.id,
                campaignRef: c.reference || `CAM-${c.id.slice(0, 8).toUpperCase()}`,
                name: c.title,
                client: c.accounts?.display_name || 'Unknown Client',
                adType: c.type,
                budget: parseFloat(c.total_budget),
                spend: parseFloat(c.spent_amount) || 0,
                impressions: parseInt(c.total_impressions) || 0,
                clicks: parseInt(c.total_clicks) || 0,
                status: c.status,
                startDate: new Date(c.start_at).toLocaleDateString(),
                endDate: new Date(c.end_at).toLocaleDateString(),
            })));
        } catch (err: any) {
            showToast(err.message || 'Failed to load campaigns.', 'error');
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
    const [pendingModerationItem, setPendingModerationItem] = useState<{ id: string, title: string, status: string } | null>(null);

    const handleSingleStatusUpdate = async (campaign: Campaign, newStatus: string, reason?: string) => {
        // If it's a rejection, we need the modal first.
        if (newStatus === 'rejected' && !reason) {
            setPendingModerationItem({ id: campaign.id, title: campaign.name, status: newStatus });
            setIsRejectionModalOpen(true);
            return;
        }

        showToast(`Updating ${campaign.name} to ${newStatus}...`, 'info');
        try {
            const updatedAt = new Date().toISOString();

            // 1. Update the campaign table status
            const { error: campaignError } = await supabase
                .from('ad_campaigns')
                .update({ status: newStatus as any, updated_at: updatedAt })
                .eq('id', campaign.id);

            if (campaignError) throw campaignError;

            // 2. Synchronise with moderation_reviews
            if (newStatus === 'rejected' || newStatus === 'active') {
                const snapshot = {
                    title: campaign.name,
                    client: campaign.client,
                    adType: campaign.adType,
                    endDate: campaign.endDate
                };

                const { error: modError } = await supabase
                    .from('moderation_reviews')
                    .upsert({
                        item_id: campaign.id,
                        item_type: 'campaign',
                        status: newStatus === 'active' ? 'approved' : 'rejected',
                        reason: reason || 'Status updated via Admin Campaigns dashboard.',
                        metadata: snapshot,
                        updated_at: updatedAt
                    }, { onConflict: 'item_id, item_type' });

                if (modError) throw modError;
            }

            showToast(`${campaign.name} successfully updated.`, 'success');
            fetchCampaigns();
            fetchDashboardSummary();
            setIsRejectionModalOpen(false);
        } catch (err: any) {
            showToast(err.message || 'Failed to update campaign status.', 'error');
        }
    };

    const handleSingleDelete = async (campaign: Campaign) => {
        if (!confirm(`Are you sure you want to delete ${campaign.name}?`)) return;
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
            const { error } = await supabase
                .from('ad_campaigns')
                .update({ status: newStatus as any, updated_at: new Date().toISOString() })
                .in('id', Array.from(selectedCampaignIds));

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
        if (!confirm(`Are you sure you want to delete ${selectedCampaignIds.size} campaigns?`)) return;
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
            <Tabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                options={[
                    { id: 'campaigns', label: 'Campaign List' },
                    { id: 'analytics', label: 'Cross-Campaign Stats' },
                    { id: 'assets', label: 'Ad Asset Library' },
                    { id: 'pricing', label: 'Ad Pricing Tiers' }
                ]}
            />

            {activeTab === 'campaigns' && (
                <>
                    <div className={adminStyles.statsGrid}>
                        <StatCard 
                            label="Total Campaigns" 
                            value={summary?.total_events ? '—' : 0} // Using total_events is a bit hacky, normally should extend summary
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
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select 
                                className={adminStyles.filterSelect}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="pending_approval">Pending approval</option>
                                <option value="paused">Paused</option>
                                <option value="rejected">Rejected</option>
                                <option value="completed">Completed</option>
                            </select>
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
                </>
            )}

            {activeTab === 'assets' && <AdAssetsTab />}
            {activeTab === 'analytics' && <AdAnalyticsTab />}
            {activeTab === 'pricing' && <AdPricingTab />}
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
