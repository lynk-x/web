"use client";
import { getErrorMessage } from '@/utils/error';

import styles from './page.module.css';
import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/utils/format';
import StatCard from '@/components/dashboard/StatCard';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import ProductTour from '@/components/dashboard/ProductTour';
import TableToolbar from '@/components/shared/TableToolbar';
import AdsPerformanceTable, { CampaignPerformance } from '@/components/ads/analytics/AdsPerformanceTable';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

function AnalyticsContent() {
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const [isLoading, setIsLoading] = useState(true);
    const initialRange = Number(searchParams.get('range')) || 7;
    const [timeRange, setTimeRange] = useState(initialRange);
    const [searchQuery, setSearchQuery] = useState('');
    const [campaigns, setCampaigns] = useState<CampaignPerformance[]>([]);
    
    const [kpis, setKpis] = useState({
        impressions: '0',
        clicks: '0',
        ctr: '0.00%',
        cpc: '$0.00'
    });

    const fetchAnalytics = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_campaigns_performance_summary', {
                p_account_id: activeAccount.id,
                p_days: timeRange
            });

            if (error) throw error;

            const results = Array.isArray(data) ? data : [];
            
            const impressions = results.reduce((acc: number, r: any) => acc + Number(r.impressions || 0), 0);
            const clicks = results.reduce((acc: number, r: any) => acc + Number(r.clicks || 0), 0);
            const totalCost = results.reduce((acc: number, r: any) => acc + Number(r.total_cost || 0), 0);

            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const cpc = clicks > 0 ? totalCost / clicks : 0;

            setKpis({
                impressions: impressions.toLocaleString(),
                clicks: clicks.toLocaleString(),
                ctr: `${ctr.toFixed(2)}%`,
                cpc: formatCurrency(cpc, 'USD')
            });

            setCampaigns(results);
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to sync your performance data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, timeRange, showToast]);

    useEffect(() => {
        if (!isOrgLoading) {
            if (activeAccount) {
                fetchAnalytics();
            } else {
                setIsLoading(false);
            }
        }
    }, [isOrgLoading, activeAccount, fetchAnalytics]);

    useEffect(() => {
        const range = searchParams.get('range');
        if (range) {
            setTimeRange(Number(range));
        }
    }, [searchParams]);

    const handleRangeChange = (newRange: number) => {
        setTimeRange(newRange);
        const params = new URLSearchParams(searchParams.toString());
        params.set('range', newRange.toString());
        router.replace(`${pathname}?${params.toString()}`);
    };

    const filteredCampaigns = useMemo(() => {
        if (!searchQuery) return campaigns;
        return campaigns.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [campaigns, searchQuery]);

    return (
        <div className={styles.container}>
            <PageHeader
                title="Ads Analytics"
                subtitle="Analyze your campaign reach and performance."
            />

            {/* Overview Cards */}
            <div className={`${sharedStyles.statsGrid} tour-ads-analytics-stats`}>
                <StatCard
                    label="Total Impressions"
                    value={kpis.impressions}
                    change="Ad visibility"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Total Clicks"
                    value={kpis.clicks}
                    change="User interactions"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Click-Through Rate"
                    value={kpis.ctr}
                    change="Performance (%)"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Cost Per Click"
                    value={kpis.cpc}
                    change="Avg. efficiency"
                    trend="positive"
                    isLoading={isLoading}
                />
            </div>

            <div className="tour-ads-analytics-range" style={{ marginTop: 'var(--spacing-md)' }}>
                <TableToolbar 
                    searchPlaceholder="Search campaigns..." 
                    searchValue={searchQuery} 
                    onSearchChange={setSearchQuery}
                >
                    <select
                        className={sharedStyles.select}
                        value={timeRange}
                        onChange={(e) => handleRangeChange(Number(e.target.value))}
                        style={{ width: 'auto', minWidth: '160px' }}
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={90}>Last 90 Days</option>
                    </select>
                </TableToolbar>
            </div>

            <div className={sharedStyles.pageCard} style={{ marginTop: 'var(--spacing-md)' }}>
                <h2 className={sharedStyles.sectionTitle}>Campaign Performance Matrix</h2>
                <AdsPerformanceTable data={filteredCampaigns} />
            </div>

            <ProductTour
                storageKey={activeAccount ? `hasSeenAdsAnalyticsJoyride_${activeAccount.id}` : 'hasSeenAdsAnalyticsJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Performance Intelligence',
                        content: 'This page provides real-time data on how your ads are performing across the Lynk-X ecosystem.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-ads-analytics-range',
                        title: 'Historical Trends',
                        content: 'Choose your measurement window to see how your campaigns have evolved over time.',
                    },
                    {
                        target: '.tour-ads-analytics-stats',
                        title: 'Success Metrics',
                        content: 'Monitor Click-Through Rate (CTR) and Cost Per Click (CPC) to measure the effectiveness and efficiency of your ad spend.',
                    }
                ]}
            />
        </div>
    );
}

export default function AnalyticsPage() {
    return (
        <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>Loading Analytics...</div>}>
            <AnalyticsContent />
        </Suspense>
    );
}
