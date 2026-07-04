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
import DateRangeRow from '@/components/shared/DateRangeRow';
import AdsPerformanceTable, { CampaignPerformance } from '@/components/ads/analytics/AdsPerformanceTable';
import Spinner from '@/components/shared/Spinner';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

function AnalyticsContent() {
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const [isLoading, setIsLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
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
            const params: any = { p_account_id: activeAccount.id };
            if (startDate) params.p_start_date = startDate;
            if (endDate) params.p_end_date = endDate;
            
            const { data, error } = await supabase.schema('api').rpc('get_campaigns_performance_summary', params);

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
    }, [activeAccount, supabase, startDate, endDate, showToast]);

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
        const urlStart = searchParams.get('startDate');
        const urlEnd = searchParams.get('endDate');
        if (urlStart) setStartDate(urlStart);
        if (urlEnd) setEndDate(urlEnd);
    }, [searchParams]);

    const handleStartDateChange = (date: string) => {
        setStartDate(date);
        const params = new URLSearchParams(searchParams.toString());
        params.set('startDate', date);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleEndDateChange = (date: string) => {
        setEndDate(date);
        const params = new URLSearchParams(searchParams.toString());
        params.set('endDate', date);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleClearDates = () => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const defaultStart = d.toISOString().split('T')[0];
        const defaultEnd = new Date().toISOString().split('T')[0];
        
        setStartDate(defaultStart);
        setEndDate(defaultEnd);
        
        const params = new URLSearchParams(searchParams.toString());
        params.delete('startDate');
        params.delete('endDate');
        router.replace(`${pathname}?${params.toString()}`);
    };

    const filteredCampaigns = useMemo(() => {
        if (!searchQuery) return campaigns;
        return campaigns.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [campaigns, searchQuery]);

    const downloadCSV = () => {
        if (!filteredCampaigns || filteredCampaigns.length === 0) return;
        
        const headers = ['Campaign', 'Status', 'Impressions', 'Clicks', 'CTR (%)', 'CPC ($)', 'Spend ($)'];
        const csvRows = [headers.join(',')];
        
        for (const item of filteredCampaigns) {
            const ctr = item.impressions > 0 ? ((item.clicks / item.impressions) * 100).toFixed(2) : '0.00';
            const cpc = item.clicks > 0 ? (item.total_cost / item.clicks).toFixed(2) : '0.00';
            
            const row = [
                `"${item.title.replace(/"/g, '""')}"`,
                item.status,
                item.impressions,
                item.clicks,
                ctr,
                cpc,
                item.total_cost.toFixed(2)
            ];
            
            csvRows.push(row.join(','));
        }
        
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Ads_Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={styles.container}>
            <PageHeader
                title="Ads Analytics"
                subtitle="Analyze your campaign reach and performance."
                actionLabel="Generate Report"
                onActionClick={downloadCSV}
                actionIcon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                }
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
                    <DateRangeRow
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={handleStartDateChange}
                        onEndDateChange={handleEndDateChange}
                        onClear={handleClearDates}
                    />
                </TableToolbar>
            </div>

            <div style={{ marginTop: 'var(--spacing-md)' }}>
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
        <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center' }}><Spinner label="Loading analytics..." /></div>}>
            <AnalyticsContent />
        </Suspense>
    );
}
