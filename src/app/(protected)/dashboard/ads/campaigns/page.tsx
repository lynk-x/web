"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './page.module.css';
import Link from 'next/link';
import AdsCampaignTable, { AdsCampaign } from '@/components/ads/campaigns/AdsCampaignTable';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import FilterGroup from '@/components/dashboard/FilterGroup';
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

    const fetchCampaigns = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('ad_campaigns')
                .select(`
                    id, title, type, start_at, end_at, status, total_budget, spent_amount, target_url, 
                    total_impressions, total_clicks
                `)
                .eq('account_id', activeAccount.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted: AdsCampaign[] = (data || []).map(c => {
                const impressions = Number(c.total_impressions || 0);
                const clicks = Number(c.total_clicks || 0);

                return {
                    id: c.id,
                    title: c.title,
                    type: c.type,
                    start_at: c.start_at,
                    end_at: c.end_at,
                    status: c.status,
                    total_budget: Number(c.total_budget),
                    spent_amount: Number(c.spent_amount),
                    target_url: c.target_url || '',
                    total_impressions: impressions,
                    total_clicks: clicks,
                    metrics: {
                        impressions,
                        clicks,
                        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0
                    }
                };
            });
            setCampaigns(formatted);
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to fetch campaigns', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast]);

    useEffect(() => {
        if (!isOrgLoading) {
            if (activeAccount) {
                fetchCampaigns();
            } else {
                setIsLoading(false);
            }
        }
    }, [isOrgLoading, activeAccount, fetchCampaigns]);

    // Filter Logic
    const filteredCampaigns = campaigns.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
    const paginatedCampaigns = filteredCampaigns.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset stuff when filters change
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
        if (selectedIds.size === paginatedCampaigns.length) {
            setSelectedIds(new Set());
        } else {
            const newSelected = new Set(selectedIds);
            paginatedCampaigns.forEach(c => newSelected.add(c.id));
            setSelectedIds(newSelected);
        }
    };

    const handleBulkPause = async () => {
        showToast(`Pausing ${selectedIds.size} campaigns...`, 'info');
        try {
            const { error } = await supabase
                .from('ad_campaigns')
                .update({ status: 'paused' })
                .in('id', Array.from(selectedIds));

            if (error) throw error;
            showToast('Campaigns paused.', 'success');
            setSelectedIds(new Set());
            fetchCampaigns();
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to pause campaigns', 'error');
        }
    };

    const handleBulkDelete = async () => {
        showToast(`Deleting ${selectedIds.size} campaigns...`, 'info');
        try {
            const { error } = await supabase
                .from('ad_campaigns')
                .delete()
                .in('id', Array.from(selectedIds));

            if (error) throw error;
            showToast(`Successfully deleted ${selectedIds.size} campaigns.`, 'success');
            setSelectedIds(new Set());
            fetchCampaigns();
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to delete campaigns', 'error');
        }
    };

    const handleDuplicate = async (id: string) => {
        showToast('Cloning campaign...', 'info');
        try {
            const { data, error } = await supabase.rpc('duplicate_ad_campaign', {
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
        const label = newStatus === 'paused' ? 'Pausing' : 'Activating';
        showToast(`${label} campaign...`, 'info');
        try {
            const { error } = await supabase
                .from('ad_campaigns')
                .update({ status: newStatus })
                .eq('id', id);
            if (error) throw error;
            showToast(`Campaign ${newStatus === 'paused' ? 'paused' : 'is now active'}.`, newStatus === 'paused' ? 'warning' : 'success');
            fetchCampaigns();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to update campaign status.', 'error');
        }
    };

    /** Single-row delete. */
    const handleSingleDelete = async (id: string, title: string) => {
        showToast(`Deleting "${title}"...`, 'info');
        try {
            const { error } = await supabase
                .from('ad_campaigns')
                .delete()
                .eq('id', id);
            if (error) throw error;
            showToast(`"${title}" deleted.`, 'success');
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
                <FilterGroup
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'active', label: 'Active' },
                        { value: 'pending_approval', label: 'Pending' },
                        { value: 'paused', label: 'Paused' },
                        { value: 'draft', label: 'Draft' },
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

                <AdsCampaignTable
                    campaigns={paginatedCampaigns}
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

            <ProductTour
                storageKey={activeAccount ? `hasSeenAdsCampaignsJoyride_${activeAccount.id}` : 'hasSeenAdsCampaignsJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Manage Ad Campaigns',
                        content: 'Track, optimize, and edit all your active or paused campaigns.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-campaigns-filter',
                        title: 'Filter Campaigns',
                        content: 'Easily find campaigns by status like Pending, Active, or Draft.',
                    },
                    {
                        target: '.tour-campaigns-table',
                        title: 'Campaign Data',
                        content: 'Select multiple campaigns to pause or delete them at once.',
                    }
                ]}
            />
        </div>
    );
}
