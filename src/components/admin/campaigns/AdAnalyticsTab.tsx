"use client";

import React, { useState, useEffect, useCallback } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import TableToolbar from '@/components/shared/TableToolbar';
import Badge from '@/components/shared/Badge';
import { formatCurrency } from '@/utils/format';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useDebounce } from '@/hooks/useDebounce';

interface AdvertiserAnalytics {
    account_id: string;
    account_name: string;
    campaign_count: number;
    total_impressions: number;
    total_clicks: number;
    total_spend: number;
    avg_ctr: number;
    avg_cpc: number;
}

export default function AdAnalyticsTab() {
    const supabase = React.useMemo(() => createClient(), []);
    const { showToast } = useToast();
    
    const [data, setData] = useState<AdvertiserAnalytics[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const debouncedSearch = useDebounce(searchTerm, 500);
    
    const itemsPerPage = 20;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_advertiser_analytics', {
                p_search: debouncedSearch,
                p_offset: (currentPage - 1) * itemsPerPage,
                p_limit: itemsPerPage
            });

            if (error) throw error;
            setData(data || []);
            setTotalCount(data?.[0]?.total_count || 0);
        } catch (error: any) {
            showToast(error.message || 'Failed to load analytics', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, debouncedSearch, currentPage, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const columns: Column<AdvertiserAnalytics>[] = [
        {
            header: '#',
            width: '50px',
            render: (r: AdvertiserAnalytics, index: number) => (
                <div style={{ opacity: 0.5, fontWeight: 600 }}>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                </div>
            )
        },
        {
            header: 'Advertiser',
            render: (r) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{r.account_name}</div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>{r.account_id}</div>
                </div>
            )
        },
        {
            header: 'Campaigns',
            render: (r) => (
                <div style={{ fontWeight: 500 }}>
                    {r.campaign_count}
                </div>
            )
        },
        {
            header: 'Reach',
            render: (r) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{r.total_impressions.toLocaleString()}</div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>Impressions</div>
                </div>
            )
        },
        {
            header: 'Engagement',
            render: (r) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{r.total_clicks.toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-brand-primary)', fontWeight: 600 }}>
                        {r.avg_ctr}% CTR
                    </div>
                </div>
            )
        },
        {
            header: 'Total Spend',
            render: (r) => (
                <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {formatCurrency(r.total_spend)}
                </div>
            )
        },
        {
            header: 'Efficiency',
            render: (r) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{formatCurrency(r.avg_cpc)}</div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>Avg. CPC</div>
                </div>
            )
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <TableToolbar
                searchPlaceholder="Filter by advertiser..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            />

            <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden' }}>
                <DataTable
                    data={data.map(r => ({ ...r, id: r.account_id }))}
                    columns={columns}
                    isLoading={isLoading}
                    currentPage={currentPage}
                    totalPages={Math.ceil(totalCount / itemsPerPage)}
                    onPageChange={setCurrentPage}
                    emptyMessage="No advertiser data found."
                />
            </div>
        </div>
    );
}
