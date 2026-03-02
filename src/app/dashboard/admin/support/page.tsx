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
import type { Report, Ticket } from '@/types/admin';

type SupportTab = 'tickets' | 'moderation' | 'app-feedback' | 'blocks' | 'report-reasons';

function SupportContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const initialTab = searchParams.get('tab') as SupportTab;
    const [activeTab, setActiveTab] = useState<SupportTab>(
        (initialTab && ['tickets', 'moderation', 'app-feedback', 'blocks', 'report-reasons'].includes(initialTab))
            ? initialTab
            : 'moderation'
    );
    const [isLoading, setIsLoading] = useState(true);

    // ── Data State ────────────────────────────────────────────────────
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [reports, setReports] = useState<Report[]>([]);

    // ── Filtering State ───────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Tab-specific filters
    const [moderationFilter, setModerationFilter] = useState('all');
    const [ticketFilter, setTicketFilter] = useState('all');

    useEffect(() => {
        const tab = searchParams.get('tab') as SupportTab;
        if (tab && ['tickets', 'moderation', 'app-feedback', 'blocks', 'report-reasons'].includes(tab)) {
            setActiveTab(tab);
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
            const [ticketsRes, reportsRes, feedbackRes] = await Promise.all([
                supabase
                    .from('support_tickets')
                    .select('*')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('reports')
                    .select('*, reporter:profiles!reporter_id(user_name)')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('app_feedback')
                    .select('*, user:profiles(full_name)')
                    .order('created_at', { ascending: false })
            ]);

            if (ticketsRes.error) throw ticketsRes.error;
            if (reportsRes.error) throw reportsRes.error;
            if (feedbackRes.error) throw feedbackRes.error;

            setTickets(ticketsRes.data.map(t => ({
                id: t.id,
                reference: t.reference,
                subject: t.subject,
                requester: 'Anonymous',
                priority: t.priority,
                status: t.status,
                lastUpdated: new Date(t.updated_at).toLocaleDateString()
            })));

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
    const getTicketActions = (ticket: Ticket): ActionItem[] => [
        {
            label: 'View',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
            onClick: () => router.push(`/dashboard/admin/support/view/${ticket.id}`),
        },
        {
            label: 'Edit',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => router.push(`/dashboard/admin/support/edit/${ticket.id}`),
        },
        {
            label: 'Resolve',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
            onClick: async () => {
                showToast(`Resolving ticket...`, 'info');
                const { error } = await supabase.from('support_tickets').update({ status: 'resolved', updated_at: new Date().toISOString() }).eq('id', ticket.id);
                if (error) showToast(error.message, 'error');
                else {
                    showToast(`Ticket resolved`, 'success');
                    fetchData();
                }
            },
            variant: 'success'
        }
    ];

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

    const ticketColumns: Column<Ticket>[] = [
        {
            header: 'Subject',
            render: t => (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{t.subject}</span>
                        <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', opacity: 0.6 }}>
                            {t.reference}
                        </span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>{t.requester}</div>
                </div>
            )
        },
        { header: 'Priority', render: t => <Badge label={t.priority.toUpperCase()} variant={t.priority === 'critical' ? 'error' : t.priority === 'high' ? 'warning' : 'info'} /> },
        { header: 'Status', render: t => <Badge label={t.status.toUpperCase()} variant={t.status === 'open' ? 'error' : 'success'} showDot /> },
        { header: 'Updated', render: t => t.lastUpdated }
    ];

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Support & Safety"
                subtitle="Platform-wide moderation and user assistance."
                actionLabel="Create Ticket"
                onActionClick={() => router.push('/dashboard/admin/support/create')}
                actionIcon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                }
            />

            <div className={sharedStyles.statsGrid}>
                <StatCard
                    label="Active Reports"
                    value={reports.filter(r => r.status === 'pending' || r.status === 'investigating').length}
                    change="Requires Attention"
                    trend="negative"
                />
                <StatCard
                    label="Open Tickets"
                    value={tickets.filter(t => t.status === 'open').length}
                    change="Help Desk"
                    trend="neutral"
                />
                <StatCard
                    label="App Health"
                    value="Stable"
                    change="Platform Verified"
                    trend="positive"
                />
                <StatCard
                    label="Escalations"
                    value={tickets.filter(t => t.priority === 'critical' || t.priority === 'high').length}
                    change="Urgent Priority"
                    trend="negative"
                />
            </div>

            <Tabs
                options={[
                    { id: 'moderation', label: 'Moderation' },
                    { id: 'tickets', label: 'Tickets' },
                    { id: 'app-feedback', label: 'App Feedback' },
                    { id: 'blocks', label: 'User Blocks' },
                    { id: 'report-reasons', label: 'Report Reasons' }
                ]}
                activeTab={activeTab}
                onTabChange={(id) => handleTabChange(id as any)}
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
                {activeTab === 'tickets' && (
                    <FilterGroup
                        options={['all', 'open', 'pending', 'resolved', 'closed'].map(f => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))}
                        currentValue={ticketFilter}
                        onChange={setTicketFilter}
                    />
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

            {activeTab === 'tickets' && (
                <DataTable<Ticket>
                    data={tickets.filter(t =>
                        (ticketFilter === 'all' || t.status === ticketFilter) &&
                        (t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || t.requester.toLowerCase().includes(searchTerm.toLowerCase()))
                    )}
                    columns={ticketColumns}
                    getActions={getTicketActions}
                    isLoading={isLoading}
                />
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
