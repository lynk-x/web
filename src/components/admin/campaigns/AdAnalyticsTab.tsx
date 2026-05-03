"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Aggregated row from `ad_analytics` joined with `ad_campaigns`. */
interface AnalyticsRow {
    id: string;
    campaign_id: string;
    campaign_title: string;
    campaign_type: string;
    interaction_type: string;
    event_count: number;
    total_cost: number;
    /** YYYY-MM-DD bucket */
    date: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Campaigns tab showing daily aggregated `ad_analytics` data.
 * Useful for fraud detection and performance oversight.
 * Data is grouped by campaign + interaction_type + date.
 */
export default function AdAnalyticsTab() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [rows, setRows] = useState<AnalyticsRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [interactionFilter, setInteractionFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 14;

    const fetchAnalytics = useCallback(async () => {
        setIsLoading(true);
        try {
            /**
             * We query the raw ad_analytics rows (limited to last 30 days)
             * and group them client-side to avoid requiring a DB view or RPC for this read.
             * For production scale, move aggregation to mv_ad_campaign_performance.
             */
            const since = new Date();
            since.setDate(since.getDate() - 30);

            const { data, error } = await supabase
                .from('ad_analytics')
                .select('campaign_id, interaction_type, cost_charged, created_at, campaign:ad_campaigns!campaign_id(title, type)')
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: false })
                .limit(5000);
            if (error) throw error;

            // Client-side aggregation: group by campaign + interaction_type + date
            const map = new Map<string, AnalyticsRow>();
            (data || []).forEach((r: any) => {
                const date = r.created_at.slice(0, 10);
                const key = `${r.campaign_id}:${r.interaction_type}:${date}`;
                if (map.has(key)) {
                    const existing = map.get(key)!;
                    existing.event_count += 1;
                    existing.total_cost += parseFloat(r.cost_charged || '0');
                } else {
                    map.set(key, {
                        id: key,
                        campaign_id: r.campaign_id,
                        campaign_title: r.campaign?.title ?? 'Unknown',
                        campaign_type: r.campaign?.type ?? '—',
                        interaction_type: r.interaction_type,
                        event_count: 1,
                        total_cost: parseFloat(r.cost_charged || '0'),
                        date,
                    });
                }
            });
            setRows(Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date)));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load analytics', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const filtered = rows.filter(r => {
        const matchesInteraction = interactionFilter === 'all' || r.interaction_type === interactionFilter;
        const matchesSearch = r.campaign_title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesInteraction && matchesSearch;
    });
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const columns: Column<AnalyticsRow>[] = [
        {
            header: 'Date',
            render: (r) => <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 600 }}>{r.date}</div>,
        },
        {
            header: 'Campaign',
            render: (r) => (
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.campaign_title}</div>
                    <Badge label={r.campaign_type} variant="info" />
                </div>
            ),
        },
        {
            header: 'Interaction',
            render: (r) => <Badge label={r.interaction_type === 'impression' ? 'CPM' : 'CPC'} variant={r.interaction_type === 'impression' ? 'neutral' : 'success'} />,
        },
        {
            header: 'Events',
            render: (r) => <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'monospace' }}>{r.event_count.toLocaleString()}</div>,
        },
        {
            header: 'Total Cost',
            render: (r) => (
                <div style={{ fontWeight: 700, fontSize: '14px', fontFamily: 'monospace' }}>
                    ${r.total_cost.toFixed(4)}
                </div>
            ),
        },
    ];

    const totalCost = filtered.reduce((acc, r) => acc + r.total_cost, 0);
    const totalEvents = filtered.reduce((acc, r) => acc + r.event_count, 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            {/* Filters */}
            <TableToolbar 
                searchPlaceholder="Search campaign analytics..." 
                searchValue={searchTerm} 
                onSearchChange={v => { setSearchTerm(v); setCurrentPage(1); }}
            >
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[{ value: 'all', label: 'All' }, { value: 'impression', label: 'Impressions (CPM)' }, { value: 'click', label: 'Clicks (CPC)' }].map(({ value, label }) => (
                        <button key={value} className={`${adminStyles.chip} ${interactionFilter === value ? adminStyles.chipActive : ''}`} onClick={() => { setInteractionFilter(value); setCurrentPage(1); }}>
                            {label}
                        </button>
                    ))}
                </div>
            </TableToolbar>

            <DataTable<AnalyticsRow>
                data={paginated}
                columns={columns}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                emptyMessage="No analytics data for the last 30 days."
            />
        </div>
    );
}
