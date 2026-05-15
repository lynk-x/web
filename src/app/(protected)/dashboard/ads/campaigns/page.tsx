"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import FilterChips from '@/components/shared/FilterChips';
import AdsCampaignTable, { AdsCampaign } from '@/components/ads/campaigns/AdsCampaignTable';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar from '@/components/shared/BulkActionsBar';
import type { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import ProductTour from '@/components/dashboard/ProductTour';

export default function CampaignsPage() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [campaigns, setCampaigns] = useState<AdsCampaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [totalCount, setTotalCount] = useState(0);

    const fetchCampaigns = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_advertiser_campaigns', {
                p_account_id: activeAccount.id,
                p_params: {
                    search: searchTerm || null,
                    status: statusFilter === 'all' ? null : statusFilter,
                    limit: itemsPerPage,
                    offset: (currentPage - 1) * itemsPerPage
                }
            });

            if (error) throw error;

            interface CampaignItem {
                id: string;
                created_at: string;
                title: string;
                type: string;
                start_at: string;
                end_at: string | null;
                status: AdsCampaign['status'];
                total_budget: number;
                spent_amount: number;
                destination_url: string | null;
                total_impressions: number;
                total_clicks: number;
            }

            const formatted: AdsCampaign[] = (data.items || []).map((c: CampaignItem) => ({
                id: c.id,
                created_at: c.created_at,
                title: c.title,
                type: c.type,
                start_at: c.start_at,
                end_at: c.end_at,
                status: c.status,
                total_budget: Number(c.total_budget),
                spent_amount: Number(c.spent_amount),
                destination_url: c.destination_url || '',
                total_impressions: Number(c.total_impressions),
                total_clicks: Number(c.total_clicks),
                metrics: {
                    impressions: Number(c.total_impressions),
                    clicks: Number(c.total_clicks),
                    ctr: Number(c.total_impressions) > 0 ? (Number(c.total_clicks) / Number(c.total_impressions)) * 100 : 0
                }
            }));
            setCampaigns(formatted);
            setTotalCount(data.total || 0);
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to sync your campaigns.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast, currentPage, itemsPerPage, searchTerm, statusFilter]);

    useEffect(() => {
        if (!isOrgLoading && activeAccount) {
            fetchCampaigns();
        }
    }, [isOrgLoading, activeAccount, fetchCampaigns]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set());
    }, [searchTerm, statusFilter]);

    // Selection Logic
    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === campaigns.length) {
            setSelectedIds(new Set());
        } else {
            const newSelected = new Set(selectedIds);
            campaigns.forEach(c => newSelected.add(c.id));
            setSelectedIds(newSelected);
        }
    };

    const handleBulkPause = async () => {
        if (!activeAccount || selectedIds.size === 0) return;
        showToast(`Pausing ${selectedIds.size} campaigns...`, 'info');
        try {
            const selectedCampaigns = campaigns
                .filter(c => selectedIds.has(c.id))
                .map(c => ({ id: c.id, created_at: c.created_at }));

            const { error } = await supabase.rpc('bulk_toggle_campaigns', {
                p_account_id: activeAccount.id,
                p_campaigns: selectedCampaigns,
                p_status: 'paused'
            });

            if (error) throw error;
            showToast('Selected campaigns paused.', 'success');
            setSelectedIds(new Set());
            fetchCampaigns();
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to pause campaigns', 'error');
        }
    };

    const handleBulkDelete = async () => {
        if (!activeAccount || selectedIds.size === 0) return;
        showToast(`Deleting ${selectedIds.size} campaigns...`, 'info');
        try {
            const selectedCampaigns = campaigns
                .filter(c => selectedIds.has(c.id))
                .map(c => ({ id: c.id, created_at: c.created_at }));

            const { error } = await supabase.rpc('bulk_delete_campaigns', {
                p_account_id: activeAccount.id,
                p_campaigns: selectedCampaigns
            });

            if (error) throw error;
            showToast(`Successfully archived ${selectedIds.size} campaigns.`, 'success');
            setSelectedIds(new Set());
            fetchCampaigns();
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to delete campaigns', 'error');
        }
    };

    const handleDuplicate = async (id: string) => {
        showToast('Cloning campaign...', 'info');
        try {
            const { error } = await supabase.rpc('duplicate_ad_campaign', {
                p_campaign_id: id
            });
            if (error) throw error;
            showToast('Campaign duplicated to draft.', 'success');
            fetchCampaigns();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Duplication failed', 'error');
        }
    };

    const handleBulkDuplicate = async () => {
        if (selectedIds.size === 0) return;
        showToast(`Cloning ${selectedIds.size} campaigns...`, 'info');
        try {
            const { data, error } = await supabase.rpc('bulk_duplicate_ad_campaigns', {
                p_campaign_ids: Array.from(selectedIds)
            });
            if (error) throw error;
            showToast(`Batch duplication complete: ${data.processed_count} campaigns added to drafts.`, 'success');
            setSelectedIds(new Set());
            fetchCampaigns();
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Bulk duplication failed', 'error');
        }
    };

    const bulkActions: BulkAction[] = [
        { label: 'Duplicate Selected', onClick: handleBulkDuplicate },
        { label: 'Pause Selected', onClick: handleBulkPause },
        { label: 'Delete Selected', onClick: handleBulkDelete, variant: 'danger' }
    ];

    /** Single-row status change (pause or resume/launch). */
    const handleStatusChange = async (id: string, newStatus: 'active' | 'paused') => {
        if (!activeAccount) return;
        const campaign = campaigns.find(c => c.id === id);
        if (!campaign) return;

        const label = newStatus === 'paused' ? 'Pausing' : 'Activating';
        showToast(`${label} campaign...`, 'info');
        try {
            const { error } = await supabase.rpc('bulk_toggle_campaigns', {
                p_account_id: activeAccount.id,
                p_campaigns: [{ id: campaign.id, created_at: campaign.created_at }],
                p_status: newStatus
            });
            if (error) throw error;
            showToast(`Campaign ${newStatus === 'paused' ? 'paused' : 'is now active'}.`, newStatus === 'paused' ? 'warning' : 'success');
            fetchCampaigns();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to update campaign status.', 'error');
        }
    };

    /** Single-row delete. */
    const handleSingleDelete = async (id: string, title: string) => {
        if (!activeAccount) return;
        const campaign = campaigns.find(c => c.id === id);
        if (!campaign) return;

        showToast(`Archiving "${title}"...`, 'info');
        try {
            const { error } = await supabase.rpc('bulk_delete_campaigns', {
                p_account_id: activeAccount.id,
                p_campaigns: [{ id: campaign.id, created_at: campaign.created_at }]
            });
            if (error) throw error;
            showToast(`"${title}" archived.`, 'success');
            fetchCampaigns();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to delete campaign.', 'error');
        }
    };

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Campaigns"
                subtitle="Track and optimize your active advertising campaigns."
                actionLabel="Create Campaign"
                actionHref="/dashboard/ads/campaigns/create"
                actionIcon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                }
            />

            <div className="tour-campaigns-filter">
                <TableToolbar
                    searchPlaceholder="Search campaigns..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
<FilterChips
                     options={[
                         { value: 'all', label: 'All' },
                         { value: 'active', label: 'Active' },
                         { value: 'pending_approval', label: 'Pending' },
                         { value: 'paused', label: 'Paused' },
                         { value: 'draft', label: 'Draft' },
                         { value: 'completed', label: 'Completed' },
                         { value: 'rejected', label: 'Rejected' },
                         { value: 'scheduled', label: 'Scheduled' },
                     ]}
                     currentValue={statusFilter}
                     onChange={setStatusFilter}
                 />
                </TableToolbar>
            </div>

            <div style={{ marginTop: '20px' }} className="tour-campaigns-table">
                <BulkActionsBar
                    selectedCount={selectedIds.size}
                    actions={bulkActions}
                    onCancel={() => setSelectedIds(new Set())}
                    itemTypeLabel="campaigns"
                />

                <div className="tour-campaigns-list">
                    <AdsCampaignTable
                        campaigns={campaigns}
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                        onSelectAll={handleSelectAll}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        onStatusChange={handleStatusChange}
                        onDelete={handleSingleDelete}
                        onDuplicate={handleDuplicate}
                    />
                </div>
            </div>

            <ProductTour
                storageKey={activeAccount ? `hasSeenAdsCampaignsJoyride_${activeAccount.id}` : 'hasSeenAdsCampaignsJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Your Ad Campaigns',
                        content: 'This list shows all your marketing efforts. You can monitor budgets, schedules and delivery status for each individual campaign.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-campaigns-filter',
                        title: 'Refine Your View',
                        content: 'Filter your campaigns by status (Active, Paused, Completed) to focus on what matters most right now.',
                    },
                    {
                        target: '.tour-campaigns-table',
                        title: 'Campaign Details',
                        content: 'Review key stats like remaining budget and total spend. You can edit, pause or duplicate campaigns directly from this list.',
                    },
                    {
                        target: '.tour-campaigns-list',
                        title: 'Optimization',
                        content: 'Review and optimize your targeting or update creative assets for individual campaigns.',
                    }
                ]}
            />
        </div>
    );
}
