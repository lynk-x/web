"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import adminStyles from '../page.module.css';

import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import FilterChips from '@/components/shared/FilterChips';
import DateRangeRow from '@/components/shared/DateRangeRow';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
type SupportTab = 'queue' | 'tickets';

import ReviewQueueTab from '@/components/admin/support/ReviewQueueTab';
import SupportTicketsTab from '@/components/admin/support/SupportTicketsTab';

function SupportContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const initialTab = (searchParams.get('tab') as SupportTab) || 'queue';
    const [activeTab, setActiveTab] = useState<SupportTab>(
        (initialTab && ['queue', 'tickets'].includes(initialTab))
            ? initialTab
            : 'queue'
    );
    const [isLoading, setIsLoading] = useState(true);

    const handleTabChange = (newTab: SupportTab) => {
        setActiveTab(newTab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };
    const [summary, setSummary] = useState<any>(null);

    // ── Filtering State ───────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('all');
    const [queueStatusFilter, setQueueStatusFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('admin_stat_summary');
            if (!error && data) setSummary(data);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);


    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Support & Safety"
                subtitle="Platform-wide moderation and user assistance."
            />

            <div className={sharedStyles.statsGrid}>
                <StatCard
                    label="Pending Reports"
                    value={summary?.moderation?.total_reports || 0}
                    change="Requires Attention"
                    trend="negative"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Unresolved Moderation"
                    value={summary?.moderation?.pending || 0}
                    change="Content flagged"
                    trend="negative"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Resolved (30d)"
                    value={summary?.moderation?.resolved_30d || 0}
                    change="Closed tickets"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Max Toxicity"
                    value={summary?.moderation?.max_toxicity !== undefined ? `${summary.moderation.max_toxicity.toFixed(1)}%` : '—'}
                    change="Community health"
                    trend={(summary?.moderation?.max_toxicity || 0) < 5 ? "positive" : "negative"}
                    isLoading={isLoading}
                />
            </div>

            <TableToolbar 
                searchPlaceholder="Search reports, feedback, or blocks..." 
                searchValue={searchTerm} 
                onSearchChange={setSearchTerm} 
            >
                <DateRangeRow 
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onClear={() => {
                        setStartDate('');
                        setEndDate('');
                    }}
                />
            </TableToolbar>

            <Tabs value={activeTab} onValueChange={(id) => handleTabChange(id as SupportTab)} className={styles.tabsReset}>
                <div className={adminStyles.tabsHeaderRow}>
                    <TabsList>
                        <TabsTrigger value="queue">Review Queue</TabsTrigger>
                        <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
                    </TabsList>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activeTab === 'queue' && (
                            <FilterChips
                                options={['all', 'pending_review', 'approved', 'rejected', 'flagged', 'appealed', 'resolved'].map(s => ({ 
                                    value: s, 
                                    label: s === 'all' ? 'All' : s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') 
                                }))}
                                currentValue={queueStatusFilter}
                                onChange={setQueueStatusFilter}
                            />
                        )}
                        {activeTab === 'tickets' && (
                            <FilterChips
                                options={['all', 'new', 'investigating', 'resolved', 'dismissed'].map(s => ({ 
                                    value: s, 
                                    label: s.charAt(0).toUpperCase() + s.slice(1) 
                                }))}
                                currentValue={feedbackStatusFilter}
                                onChange={setFeedbackStatusFilter}
                            />
                        )}
                    </div>
                </div>

                <TabsContent value="queue">
                    <ReviewQueueTab searchQuery={searchTerm} statusFilter={queueStatusFilter} startDate={startDate} endDate={endDate} />
                </TabsContent>

                <TabsContent value="tickets">
                    <SupportTicketsTab 
                        searchQuery={searchTerm}
                        statusFilter={feedbackStatusFilter}
                        startDate={startDate}
                        endDate={endDate}
                    />
                </TabsContent>
            </Tabs>

        </div>
    );
}

export default function SupportPage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Support...</div>}>
            <SupportContent />
        </Suspense>
    );
}
