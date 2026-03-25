"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
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

import Tabs from '@/components/dashboard/Tabs';

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
    const itemsPerPage = 8;

    useEffect(() => {
        const tab = searchParams.get('tab') as string;
        if (tab && ['campaigns', 'assets', 'analytics', 'pricing'].includes(tab)) {
            setActiveTab(tab as typeof activeTab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: 'campaigns' | 'assets' | 'analytics' | 'pricing') => {
        setActiveTab(newTab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    useEffect(() => {
        const fetchCampaigns = async () => {
            setIsLoading(true);
            try {
                // Fetch campaigns with their account/client info and performance metrics
                const { data, error } = await supabase
                    .from('ad_campaigns')
                    .select(`
                        *,
                        accounts!account_id(display_name)
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const mappedCampaigns: Campaign[] = (data || []).map((c: any) => {
                    return {
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
                    };
                });

                setCampaigns(mappedCampaigns);
            } catch (err: any) {
                console.error('Error fetching campaigns:', err);
                showToast('Failed to load campaigns.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCampaigns();
    }, [supabase, showToast]);

    // Filter Logic
    const filteredCampaigns = campaigns.filter(campaign => {
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

    const handleBulkStatusUpdate = async (newStatus: string) => {
        showToast(`Updating ${selectedCampaignIds.size} campaigns to ${newStatus}...`, 'info');

        try {
            const { error } = await supabase.rpc('bulk_update_campaign_status', {
                campaign_ids: Array.from(selectedCampaignIds),
                new_status: newStatus
            });

            if (error) throw error;

            showToast(`Successfully moved ${selectedCampaignIds.size} campaigns to ${newStatus}.`, 'success');

            // Refresh local state
            setCampaigns(prev => prev.map(c =>
                selectedCampaignIds.has(c.id) ? { ...c, status: newStatus as 'draft' | 'pending_approval' | 'active' | 'completed' | 'paused' | 'rejected' } : c
            ));
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
            setCampaigns(prev => prev.filter(c => !selectedCampaignIds.has(c.id)));
            setSelectedCampaignIds(new Set());
        } catch (err) {
            showToast('Failed to delete campaigns.', 'error');
        }
    };

    const bulkActions: BulkAction[] = [
        { label: 'Approve Selected', onClick: () => handleBulkStatusUpdate('active'), variant: 'success' },
        { label: 'Reject Selected', onClick: () => handleBulkStatusUpdate('rejected') },
        { label: 'Delete Selected', onClick: handleBulkDelete, variant: 'danger' }
    ];

    const stats = useMemo(() => {
        const total = campaigns.length;
        const active = campaigns.filter(c => c.status === 'active').length;
        const pending = campaigns.filter(c => c.status === 'pending_approval').length;
        const avgCTR = campaigns.length > 0 
            ? (campaigns.reduce((acc, c) => acc + (c.clicks / (c.impressions || 1)), 0) / campaigns.length) * 100 
            : 0;

        return { total, active, pending, avgCTR };
    }, [campaigns]);

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

            <div className={adminStyles.statsGrid}>
                <StatCard
                    label="Total Campaigns"
                    value={stats.total}
                    change="Platform history"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Active Campaigns"
                    value={stats.active}
                    change="Live impressions"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Pending Approval"
                    value={stats.pending}
                    change="Awaiting review"
                    trend={stats.pending > 0 ? "neutral" : "positive"}
                    isLoading={isLoading}
                />
                <StatCard
                    label="Avg. Campaign CTR"
                    value={`${stats.avgCTR.toFixed(2)}%`}
                    change="Engagement benchmark"
                    trend={stats.avgCTR > 1 ? "positive" : "neutral"}
                    isLoading={isLoading}
                />
            </div>

            {/* ── Tab switcher ── */}
            <Tabs
                options={[
                    { id: 'campaigns', label: 'Campaigns' },
                    { id: 'assets', label: 'Ad Assets' },
                    { id: 'analytics', label: 'Analytics' },
                    { id: 'pricing', label: 'Pricing Model' }
                ]}
                activeTab={activeTab}
                onTabChange={(id) => handleTabChange(id as Extract<typeof activeTab, string>)}
            />

            {/* ── Campaigns tab (existing content) ── */}
            {activeTab === 'campaigns' && (
                <>
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
                            style={{ width: 'auto', minWidth: '180px', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20,20,20,0.8)', color: 'white' }}
                        >
                            <option value="all">All Ad Types</option>
                            <option value="banner">Banner</option>
                            <option value="interstitial">Interstitial</option>
                        </select>

                        {/* Status filter — aligned to campaign_status enum */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                { value: 'all', label: 'All Statuses' },
                                { value: 'active', label: 'Active' },
                                { value: 'pending_approval', label: 'Awaiting Approval' },
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

                    {isLoading ? (
                        <div style={{ padding: '60px', textAlign: 'center', opacity: 0.6 }}>Loading campaigns...</div>
                    ) : (
                        <CampaignTable
                            campaigns={paginatedCampaigns}
                            selectedIds={selectedCampaignIds}
                            onSelect={handleSelectCampaign}
                            onSelectAll={handleSelectAll}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </>
            )}

            {activeTab === 'assets' && (
                <AdAssetsTab />
            )}

            {activeTab === 'analytics' && (
                <AdAnalyticsTab />
            )}

            {activeTab === 'pricing' && (
                <AdPricingTab />
            )}
        </div>
    );
}

export default function AdminCampaignsPage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Campaigns...</div>}>
            <CampaignsContent />
        </Suspense>
    );
}
