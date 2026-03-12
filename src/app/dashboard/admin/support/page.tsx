"use client";

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
import Tabs from '@/components/dashboard/Tabs';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/types/shared';
import { createClient } from '@/utils/supabase/client';
import ReportTable from '@/components/admin/moderation/ReportTable';
import AppFeedbackTab from '@/components/admin/support/AppFeedbackTab';
import UserBlocksTab from '@/components/admin/support/UserBlocksTab';
import ReportReasonsTab from '@/components/admin/support/ReportReasonsTab';
import type { Report } from '@/types/admin';

type SupportTab = 'moderation' | 'app-feedback' | 'blocks' | 'report-reasons';

function SupportContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const initialTab = searchParams.get('tab') as SupportTab;
    const [activeTab, setActiveTab] = useState<SupportTab>(
        (initialTab && ['moderation', 'app-feedback', 'blocks', 'report-reasons'].includes(initialTab))
            ? initialTab
            : 'moderation'
    );
    const [isLoading, setIsLoading] = useState(true);

    // ── Data State ────────────────────────────────────────────────────
    const [reports, setReports] = useState<Report[]>([]);

    // ── Filtering State ───────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Tab-specific filters
    const [moderationFilter, setModerationFilter] = useState('all');

    // App Feedback specific filters
    const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('all');
    const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState('all');
    const [feedbackCategories, setFeedbackCategories] = useState<string[]>([]);

    useEffect(() => {
        const tab = searchParams.get('tab') as SupportTab;
        if (tab && ['moderation', 'app-feedback', 'blocks', 'report-reasons'].includes(tab)) {
            setActiveTab(tab as typeof activeTab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: SupportTab) => {
        setActiveTab(newTab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch everything in parallel to populate stat cards
            const [reportsRes, feedbackRes] = await Promise.all([
                supabase
                    .from('reports')
                    .select('*, reporter:user_profile!reporter_id(user_name)')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('app_feedback')
                    .select('*, user:user_profile(full_name)')
                    .order('created_at', { ascending: false })
            ]);

            if (reportsRes.error) throw reportsRes.error;
            if (feedbackRes.error) throw feedbackRes.error;

            setReports(reportsRes.data.map(r => ({
                id: r.id,
                targetType: r.target_user_id ? 'user' : r.target_event_id ? 'event' : 'message',
                targetId: r.target_user_id || r.target_event_id || r.target_message_id,
                title: `Report #${r.id.slice(0, 8)}`,
                description: r.description,
                date: new Date(r.created_at).toLocaleDateString(),
                reporter: r.reporter?.user_name || 'Anonymous',
                status: r.status,
                reasonId: r.reason_id
            })));

            if (feedbackRes.data) {
                const uniqueCats = Array.from(new Set(feedbackRes.data.map((f: any) => f.category))).sort();
                setFeedbackCategories(uniqueCats as string[]);
            }


        } catch (err: any) {
            showToast(err.message || "Failed to load data", "error");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => {
        fetchData();
    }, [activeTab, fetchData]);

    // ── Ticket Actions ────────────────────────────────────────────────

    const getModerationActions = (report: Report): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'Investigate',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
                onClick: async () => {
                    showToast('Starting investigation...', 'info');
                    const { error } = await supabase.from('reports').update({ status: 'investigating', updated_at: new Date().toISOString() }).eq('id', report.id);
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
                    const { error } = await supabase.from('reports').update({ status: 'resolved', resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', report.id);
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
                    label="Active Reports"
                    value={reports.filter(r => r.status === 'pending' || r.status === 'investigating').length}
                    change="Requires Attention"
                    trend="negative"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Feedback Reviewed"
                    value="None"
                    change="User Insights"
                    trend="neutral"
                    isLoading={isLoading}
                />
                <StatCard
                    label="App Health"
                    value="Stable"
                    change="Platform Verified"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Security Blocks"
                    value="Active"
                    change="Firewall Status"
                    trend="positive"
                    isLoading={isLoading}
                />
            </div>

            <Tabs
                options={[
                    { id: 'moderation', label: 'Moderation' },
                    { id: 'app-feedback', label: 'App Feedback' },
                    { id: 'blocks', label: 'User Blocks' },
                    { id: 'report-reasons', label: 'Report Reasons' }
                ]}
                activeTab={activeTab}
                onTabChange={(id) => handleTabChange(id as SupportTab)}
                className={styles.tabsReset}
            />

            <TableToolbar searchPlaceholder="Search..." searchValue={searchTerm} onSearchChange={setSearchTerm}>
                {activeTab === 'moderation' && (
                    <FilterGroup
                        options={['all', 'pending', 'investigating', 'resolved', 'dismissed'].map(f => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))}
                        currentValue={moderationFilter}
                        onChange={setModerationFilter}
                    />
                )}
                {activeTab === 'app-feedback' && (
                    <>
                        <FilterGroup
                            options={['all', 'new', 'reviewed', 'resolved', 'dismissed'].map(s => ({ value: s, label: s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1) }))}
                            currentValue={feedbackStatusFilter}
                            onChange={setFeedbackStatusFilter}
                        />
                        {feedbackCategories.length > 0 && (
                            <select
                                value={feedbackCategoryFilter}
                                onChange={e => setFeedbackCategoryFilter(e.target.value)}
                                className={adminStyles.select}
                                style={{ width: 'auto', padding: '6px 12px', height: '36px', fontSize: '13px' }}
                            >
                                <option value="all">All Categories</option>
                                {feedbackCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}
                    </>
                )}
            </TableToolbar>

            {activeTab === 'moderation' && (
                <ReportTable
                    reports={reports.filter(r =>
                        (moderationFilter === 'all' || r.status === moderationFilter) &&
                        (r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.reporter.toLowerCase().includes(searchTerm.toLowerCase()))
                    )}
                    isLoading={isLoading}
                    getActions={getModerationActions}
                />
            )}


            {activeTab === 'app-feedback' && (
                <AppFeedbackTab
                    searchQuery={searchTerm}
                    statusFilter={feedbackStatusFilter}
                    categoryFilter={feedbackCategoryFilter}
                />
            )}

            {activeTab === 'blocks' && (
                <UserBlocksTab searchQuery={searchTerm} />
            )}

            {activeTab === 'report-reasons' && (
                <ReportReasonsTab />
            )}
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
