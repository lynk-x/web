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
import FilterGroup from '@/components/dashboard/FilterGroup';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import StatusFilterChips from '@/components/shared/StatusFilterChips';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/types/shared';
import { createClient } from '@/utils/supabase/client';
import ReportTable from '@/components/admin/moderation/ReportTable';
type SupportTab = 'queue' | 'tickets' | 'feedback' | 'reports';

import ReviewQueueTab from '@/components/admin/support/ReviewQueueTab';
import SupportTicketsTab from '@/components/admin/support/SupportTicketsTab';
import AppFeedbackTab from '@/components/admin/support/AppFeedbackTab';
import type { Report } from '@/types/admin';

import { useDebounce } from '@/hooks/useDebounce';

function SupportContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const initialTab = (searchParams.get('tab') as SupportTab) || 'queue';
    const [activeTab, setActiveTab] = useState<SupportTab>(
        (initialTab && ['queue', 'tickets', 'feedback', 'reports'].includes(initialTab))
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

    // ── Data State ────────────────────────────────────────────────────
    const [reports, setReports] = useState<Report[]>([]);

    // ── Filtering State ───────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const debouncedSearch = useDebounce(searchTerm, 500);
    const itemsPerPage = 20;

    // Tab-specific filters
    const [moderationFilter, setModerationFilter] = useState('all');

    // App Feedback specific filters
    const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('all');
    const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState('all');
    const [feedbackCategories, setFeedbackCategories] = useState<string[]>([]);

    const fetchSummary = useCallback(async () => {
        const { data, error } = await supabase.rpc('admin_stat_summary');
        if (!error && data) setSummary(data);
    }, [supabase]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const offset = (currentPage - 1) * itemsPerPage;

            if (activeTab === 'reports') {
                const { data, error } = await supabase.rpc('get_admin_support_data', {
                    p_tab: 'moderation',
                    p_params: {
                        search: debouncedSearch,
                        status: moderationFilter,
                        limit: itemsPerPage,
                        offset: offset
                    }
                });

                if (error) throw error;
                
                setTotalCount(data.total || 0);
                setReports((data.items || []).map((r: any) => ({
                    id: r.id,
                    targetType: r.target_user_id ? 'user' : r.target_event_id ? 'event' : 'message',
                    targetId: r.target_user_id || r.target_event_id || r.target_message_id,
                    title: `Report #${r.id.slice(0, 8)}`,
                    description: r.info?.description || `Report ${r.reference}`,
                    date: new Date(r.created_at).toLocaleDateString(),
                    reporter: r.reporter_username || 'Anonymous',
                    status: r.status,
                    createdAt: r.created_at,
                    reasonId: r.reason_id
                })));
            }
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || "Failed to load reports", "error");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, activeTab, currentPage, moderationFilter, debouncedSearch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, moderationFilter, debouncedSearch]);

    // ── Ticket Actions ────────────────────────────────────────────────

    const getModerationActions = (report: Report): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'Investigate',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
                onClick: async () => {
                    showToast('Starting investigation...', 'info');
                    const { error } = await supabase.rpc('moderate_report', { 
                        p_report_id: report.id, 
                        p_report_created_at: report.createdAt,
                        p_status: 'investigating' 
                    });
                    if (error) showToast(error.message, 'error');
                    else {
                        showToast('Started investigation', 'info');
                        fetchData();
                    }
                }
            }
        ];

        if (report.status !== 'resolved') {
            actions.push({
                label: 'Resolve',
                variant: 'success',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                onClick: async () => {
                    showToast('Resolving report...', 'info');
                    const { error } = await supabase.rpc('moderate_report', { 
                        p_report_id: report.id, 
                        p_report_created_at: report.createdAt,
                        p_status: 'resolved' 
                    });
                    if (error) showToast(error.message, 'error');
                    else {
                        showToast('Report resolved', 'success');
                        fetchData();
                    }
                }
            });
        }

        return actions;
    };


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
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {activeTab === 'reports' && (
                        <StatusFilterChips
                            options={['all', 'pending', 'investigating', 'resolved', 'dismissed'].map(f => ({ 
                                value: f, 
                                label: f.charAt(0).toUpperCase() + f.slice(1) 
                            }))}
                            currentValue={moderationFilter}
                            onChange={setModerationFilter}
                        />
                    )}
                    {activeTab === 'tickets' && (
                        <StatusFilterChips
                            options={['all', 'new', 'investigating', 'resolved', 'dismissed'].map(s => ({ 
                                value: s, 
                                label: s.charAt(0).toUpperCase() + s.slice(1) 
                            }))}
                            currentValue={feedbackStatusFilter}
                            onChange={setFeedbackStatusFilter}
                        />
                    )}
                </div>
            </TableToolbar>

            <Tabs value={activeTab} onValueChange={(id) => handleTabChange(id as SupportTab)} className={styles.tabsReset}>
                <div className={adminStyles.tabsHeaderRow}>
                    <TabsList>
                        <TabsTrigger value="queue">Review Queue</TabsTrigger>
                        <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
                        <TabsTrigger value="feedback">User Feedback</TabsTrigger>
                        <TabsTrigger value="reports">Report History</TabsTrigger>
                    </TabsList>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activeTab === 'reports' && (
                            <StatusFilterChips
                                options={['all', 'pending', 'investigating', 'resolved', 'dismissed'].map(f => ({ 
                                    value: f, 
                                    label: f.charAt(0).toUpperCase() + f.slice(1) 
                                }))}
                                currentValue={moderationFilter}
                                onChange={setModerationFilter}
                            />
                        )}
                        {activeTab === 'tickets' && (
                            <StatusFilterChips
                                options={['all', 'new', 'investigating', 'resolved', 'dismissed'].map(s => ({ 
                                    value: s, 
                                    label: s.charAt(0).toUpperCase() + s.slice(1) 
                                }))}
                                currentValue={feedbackStatusFilter}
                                onChange={setFeedbackStatusFilter}
                            />
                        )}
                        {activeTab === 'feedback' && (
                            <StatusFilterChips
                                options={['all', 'new', 'reviewed', 'resolved', 'dismissed'].map(s => ({ 
                                    value: s, 
                                    label: s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1) 
                                }))}
                                currentValue={feedbackStatusFilter}
                                onChange={setFeedbackStatusFilter}
                            />
                        )}
                    </div>
                </div>

                <TabsContent value="queue">
                    <ReviewQueueTab searchQuery={searchTerm} />
                </TabsContent>

                <TabsContent value="tickets">
                    <SupportTicketsTab 
                        searchQuery={searchTerm}
                        statusFilter={feedbackStatusFilter}
                    />
                </TabsContent>

                <TabsContent value="feedback">
                    <AppFeedbackTab
                        searchQuery={searchTerm}
                        statusFilter={feedbackStatusFilter}
                    />
                </TabsContent>

                <TabsContent value="reports">
                    <ReportTable
                        reports={reports}
                        isLoading={isLoading}
                        getActions={getModerationActions}
                        currentPage={currentPage}
                        totalPages={Math.ceil(totalCount / itemsPerPage)}
                        onPageChange={setCurrentPage}
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
