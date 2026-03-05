"use client";

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
                    *,
                    ad_analytics (interaction_type, cost_charged, created_at)
                `)
                .eq('account_id', activeAccount.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted: AdsCampaign[] = (data || []).map(c => {
                const impressions = (c.ad_analytics || []).filter((a: any) => a.interaction_type === 'impression').length;
                const clicks = (c.ad_analytics || []).filter((a: any) => a.interaction_type === 'click').length;

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
                    metrics: {
                        impressions,
                        clicks,
                        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0
                    }
                };
            });
            setCampaigns(formatted);
        } catch (error: any) {
            showToast(error.message || 'Failed to fetch campaigns', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast]);

    useEffect(() => {
        if (!isOrgLoading) {
            fetchCampaigns();
        }
    }, [isOrgLoading, fetchCampaigns]);

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
        } catch (error: any) {
            showToast(error.message || 'Failed to pause campaigns', 'error');
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
        } catch (error: any) {
            showToast(error.message || 'Failed to delete campaigns', 'error');
        }
    };

    const bulkActions: BulkAction[] = [
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
        } catch (err: any) {
            showToast(err.message || 'Failed to update campaign status.', 'error');
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
        } catch (err: any) {
            showToast(err.message || 'Failed to delete campaign.', 'error');
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

            <TableToolbar
                searchPlaceholder="Search campaigns..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <FilterGroup
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'active', label: 'Active' },
                        { value: 'paused', label: 'Paused' },
                        { value: 'draft', label: 'Draft' },
                    ]}
                    currentValue={statusFilter}
                    onChange={setStatusFilter}
                />
            </TableToolbar>

            <div style={{ marginTop: '20px' }}>
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
                />
            </div>
        </div>
    );
}
