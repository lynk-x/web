"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import CampaignTable, { Campaign } from '@/components/admin/campaigns/CampaignTable';
import Link from 'next/link';

/**
 * Mock campaigns — aligned to `campaign_status` enum + `ad_type` enum.
 * When wiring up: `supabase.from('ad_campaigns').select('*, ad_assets(*)')`
 */
const mockCampaigns: Campaign[] = [
    { id: '1', campaignRef: 'CAMP-001', name: 'Summer Festival Promo', client: 'Global Beats', adType: 'banner', budget: 5000, spend: 3200, impressions: 150000, clicks: 4500, status: 'active', startDate: '2025-06-01', endDate: '2025-07-15' },
    { id: '2', campaignRef: 'CAMP-002', name: 'Product Launch Q3', client: 'TechDaily', adType: 'feed_card', budget: 12000, spend: 0, impressions: 0, clicks: 0, status: 'draft', startDate: '2025-08-01', endDate: '2025-08-31' },
    { id: '3', campaignRef: 'CAMP-003', name: 'Brand Awareness', client: 'Local Coffee', adType: 'map_pin', budget: 1000, spend: 850, impressions: 45000, clicks: 1200, status: 'paused', startDate: '2025-05-01', endDate: '2025-12-31' },
    { id: '4', campaignRef: 'CAMP-004', name: 'Holiday Special', client: 'RetailGiant', adType: 'banner', budget: 25000, spend: 25000, impressions: 800000, clicks: 25000, status: 'completed', startDate: '2024-12-01', endDate: '2024-12-31' },
    { id: '5', campaignRef: 'CAMP-005', name: 'Questionable Crypto Ad', client: 'Unknown Entity', adType: 'banner', budget: 500, spend: 0, impressions: 0, clicks: 0, status: 'rejected', startDate: '2025-07-01', endDate: '2025-07-07' },
    { id: '6', campaignRef: 'CAMP-006', name: 'Back to School', client: 'Staples Center', adType: 'interstitial', budget: 8000, spend: 1200, impressions: 60000, clicks: 1800, status: 'active', startDate: '2025-08-15', endDate: '2025-09-15' },
    { id: '7', campaignRef: 'CAMP-007', name: 'Flash Sale Alert', client: 'FashionAuto', adType: 'feed_card', budget: 2000, spend: 0, impressions: 0, clicks: 0, status: 'draft', startDate: '2025-06-20', endDate: '2025-06-25' },
];

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';

export default function AdminCampaignsPage() {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [adTypeFilter, setAdTypeFilter] = useState('all');
    const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic
    const filteredCampaigns = mockCampaigns.filter(campaign => {
        const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            campaign.client.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
        const matchesAdType = adTypeFilter === 'all' || campaign.adType === adTypeFilter;
        return matchesSearch && matchesStatus && matchesAdType;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
    const paginatedCampaigns = filteredCampaigns.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedCampaignIds(new Set()); // Clear selection on filter change
    }, [searchTerm, statusFilter, adTypeFilter]);

    // Selection Logic
    const handleSelectCampaign = (id: string) => {
        const newSelected = new Set(selectedCampaignIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedCampaignIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedCampaignIds.size === paginatedCampaigns.length) {
            setSelectedCampaignIds(new Set());
        } else {
            const newSelected = new Set(selectedCampaignIds);
            paginatedCampaigns.forEach(campaign => newSelected.add(campaign.id));
            setSelectedCampaignIds(newSelected);
        }
    };

    const handleBulkApprove = () => {
        showToast(`Approving ${selectedCampaignIds.size} campaigns...`, 'info');
        setTimeout(() => {
            showToast('Campaigns approved successfully.', 'success');
            setSelectedCampaignIds(new Set());
        }, 1000);
    };

    const handleBulkReject = () => {
        showToast(`Rejecting ${selectedCampaignIds.size} campaigns...`, 'info');
        setTimeout(() => {
            showToast('Campaigns rejected.', 'error');
            setSelectedCampaignIds(new Set());
        }, 1000);
    };

    const handleBulkDelete = () => {
        showToast(`Deleting ${selectedCampaignIds.size} campaigns...`, 'info');
        setTimeout(() => {
            showToast(`Successfully deleted ${selectedCampaignIds.size} campaigns.`, 'success');
            setSelectedCampaignIds(new Set());
        }, 1000);
    };

    const bulkActions: BulkAction[] = [
        { label: 'Approve Selected', onClick: handleBulkApprove, variant: 'success' },
        { label: 'Reject Selected', onClick: handleBulkReject },
        { label: 'Delete Selected', onClick: handleBulkDelete, variant: 'danger' }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Ad Campaign Management</h1>
                    <p className={adminStyles.subtitle}>Review and moderate all advertising campaigns across the platform.</p>
                </div>
                <Link href="/dashboard/admin/campaigns/create">
                    <button className={adminStyles.btnPrimary}>+ Create Campaign</button>
                </Link>
            </header>

            <TableToolbar
                searchPlaceholder="Search campaigns or clients..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                {/* Ad Type filter */}
                <select
                    className={adminStyles.select}
                    value={adTypeFilter}
                    onChange={(e) => setAdTypeFilter(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20,20,20,0.8)', color: 'white' }}
                >
                    <option value="all">All Ad Types</option>
                    <option value="banner">Banner</option>
                    <option value="interstitial">Interstitial</option>
                    <option value="feed_card">Feed Card</option>
                    <option value="map_pin">Map Pin</option>
                </select>

                {/* Status filter — aligned to campaign_status enum (draft replaces pending) */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                        { value: 'all', label: 'All Statuses' },
                        { value: 'active', label: 'Active' },
                        { value: 'draft', label: 'Draft' },
                        { value: 'paused', label: 'Paused' },
                        { value: 'rejected', label: 'Rejected' },
                        { value: 'completed', label: 'Completed' },
                    ].map(({ value, label }) => (
                        <button
                            key={value}
                            className={`${adminStyles.chip} ${statusFilter === value ? adminStyles.chipActive : ''}`}
                            onClick={() => setStatusFilter(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </TableToolbar>

            <BulkActionsBar
                selectedCount={selectedCampaignIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedCampaignIds(new Set())}
                itemTypeLabel="campaigns"
            />

            <CampaignTable
                campaigns={paginatedCampaigns}
                selectedIds={selectedCampaignIds}
                onSelect={handleSelectCampaign}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
