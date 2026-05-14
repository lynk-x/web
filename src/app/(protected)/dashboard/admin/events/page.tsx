"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FilterChips from '@/components/shared/FilterChips';
import { useModerationAction } from '@/hooks/useModerationAction';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import EventTable, { Event } from '@/components/features/events/EventTable';

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import { exportToCSV } from '@/utils/export';
import { createClient } from '@/utils/supabase/client';
import { formatDate, formatTime } from '@/utils/format';
import DateRangeRow from '@/components/shared/DateRangeRow';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import RejectionModal from '@/components/shared/RejectionModal';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import ForumTable from '@/components/admin/forums/ForumTable';
import type { ForumThread, Report } from '@/types/admin';
import Modal from '@/components/shared/Modal';
import ForumMessagesTab from '@/components/admin/forums/ForumMessagesTab';
import ReportTable from '@/components/admin/moderation/ReportTable';
import TicketingTab from '@/components/admin/events/ticketing/TicketingTab';
import PayoutTable, { Payout } from '@/components/admin/finance/PayoutTable';
import { formatRelativeTime, formatCurrency } from '@/utils/format';

// --- Local Components ---

const EventReportsSection = ({ eventId }: { eventId: string }) => {
    const supabase = useMemo(() => createClient(), []);
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReports = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('reports')
                .select('*, reporter:user_profile!reporter_id(user_name), reason:report_reasons(display_name)')
                .eq('target_event_id', eventId);

            if (error) throw error;

            setReports((data || []).map((r: any) => ({
                id: r.id,
                targetType: 'event',
                targetId: r.target_event_id,
                title: r.reason?.display_name || `Report #${r.id.slice(0, 8)}`,
                description: r.info?.description || 'No description provided.',
                date: new Date(r.created_at).toLocaleDateString(),
                reporter: r.reporter?.user_name || 'Anonymous', 
                status: (r.status === 'under_investigation' ? 'investigating' : r.status) as Report['status'],
                createdAt: r.created_at,
                reasonId: r.reason_id
            })));
        } catch (err) {
            console.error('Failed to fetch event reports:', err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, eventId]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    return <ReportTable reports={reports} isLoading={isLoading} />;
};

export default function AdminEventsPage() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const { executeAction } = useModerationAction();
    const router = useRouter();

    const [events, setEvents] = useState<Event[]>([]);
    const [threads, setThreads] = useState<ForumThread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [forumStatusFilter, setForumStatusFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('events');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
    const [selectedForumIds, setSelectedForumIds] = useState<Set<string>>(new Set());
    const [summary, setSummary] = useState<any>(null);

    // Payouts State
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [selectedPayoutIds, setSelectedPayoutIds] = useState<Set<string>>(new Set());
    const [isPayoutRejectModalOpen, setIsPayoutRejectModalOpen] = useState(false);
    const [pendingRejectPayout, setPendingRejectPayout] = useState<Payout | null>(null);
    const [payoutCountryFilter, setPayoutCountryFilter] = useState('all');
    const [countries, setCountries] = useState<{ code: string, name: string }[]>([]);

    const debouncedSearch = useDebounce(searchTerm, 500);
    const itemsPerPage = 10;

    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const fetchDashboardSummary = useCallback(async () => {
        const { data, error } = await supabase.rpc('admin_stat_summary');
        if (!error && data) {
            setSummary(data);
        }
    }, [supabase]);

    const fetchPayouts = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_payouts', {
                p_search: debouncedSearch,
                p_start_date: startDate ? new Date(startDate).toISOString() : null,
                p_end_date: endDate ? new Date(endDate).toISOString() : null,
                p_country_code: payoutCountryFilter,
                p_offset: (currentPage - 1) * itemsPerPage,
                p_limit: itemsPerPage
            });

            if (error) throw error;
            const total = data?.[0]?.total_count || 0;
            setTotalCount(total);

            setPayouts((data || []).map((p: any) => ({
                id: p.id,
                recipient: p.recipient_name,
                amount: p.amount,
                status: p.status,
                requestedAt: p.created_at,
                reference: p.reference,
                bankName: p.bank_name,
                type: p.method,
                kyc_status: p.approval_status,
                kyc_tier: p.kyc_tier,
                is_verified: p.is_verified,
                reporting_amount: p.reporting_amount,
                reporting_currency: p.reporting_currency,
                createdAt: p.created_at
            })));
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, debouncedSearch, startDate, endDate, payoutCountryFilter, currentPage, showToast]);

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_events', {
                p_search: debouncedSearch,
                p_status: statusFilter,
                p_forum_status: forumStatusFilter,
                p_start_date: startDate || null,
                p_end_date: endDate || null,
                p_offset: (currentPage - 1) * itemsPerPage,
                p_limit: itemsPerPage
            });

            if (error) throw error;

            setTotalCount(data?.[0]?.total_count || 0);
            
            const mappedEvents: Event[] = (data || []).map((e: any) => ({
                id: e.id,
                title: e.event_title,
                organizer: e.account_name || 'Unknown',
                date: formatDate(e.starts_at),
                endDate: e.ends_at ? formatDate(e.ends_at) : undefined,
                time: formatTime(e.starts_at),
                endTime: e.ends_at ? formatTime(e.ends_at) : undefined,
                location: e.location_name || (e.is_private ? 'Private' : 'TBA'),
                status: e.status,
                attendees: e.attendee_count || 0,
                eventReference: e.reference,
                isPrivate: e.is_private,
                thumbnailUrl: e.thumbnail,
                reportsCount: e.reports_count || 0,
                forum_id: e.forum_id,
                forum_status: e.forum_status,
                message_count: e.message_count,
                media_count: e.media_count,
                escalated_reports_count: e.escalated_reports_count
            }));

            const mappedThreads: ForumThread[] = (data || [])
                .filter((e: any) => !!e.forum_id)
                .map((e: any) => ({
                    id: e.forum_id,
                    reference: e.reference,
                    title: `${e.event_title} Forum`,
                    eventName: e.event_title,
                    messageCount: Number(e.message_count || 0),
                    mediaCount: Number(e.media_count || 0),
                    channelsCount: Number(e.channels_count || 0),
                    reportsCount: Number(e.reports_count || 0),
                    escalatedCount: Number(e.escalated_reports_count || 0),
                    oldestReportAt: undefined, // Would need joining in RPC for exact date
                    status: (e.forum_status || 'open') as any,
                    createdAt: e.starts_at // Approximation
                }));

            setEvents(mappedEvents);
            setThreads(mappedThreads);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load events.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, debouncedSearch, statusFilter, currentPage, showToast]);

    const fetchCountries = useCallback(async () => {
        const { data } = await supabase.from('countries').select('code, display_name').order('display_name');
        if (data) {
            setCountries(data.map(c => ({ code: c.code, name: c.display_name })));
        }
    }, [supabase]);

    useEffect(() => {
        fetchCountries();
    }, [fetchCountries]);

    useEffect(() => {
        if (activeTab === 'events') fetchEvents();
        else if (activeTab === 'payouts') fetchPayouts();
    }, [activeTab, fetchEvents, fetchPayouts]);

    useEffect(() => {
        fetchDashboardSummary();
    }, [fetchDashboardSummary]);

    // Reset page on search/filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, statusFilter, forumStatusFilter, activeTab, startDate, endDate, payoutCountryFilter]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [pendingModerationItem, setPendingModerationItem] = useState<{ id: string, title: string, status: string } | null>(null);

    // Selection Logic
    const handleSelectEvent = (id: string) => {
        const newSelected = new Set(selectedEventIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedEventIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedEventIds.size === events.length) {
            setSelectedEventIds(new Set());
        } else {
            const newSelected = new Set(selectedEventIds);
            events.forEach(event => newSelected.add(event.id));
            setSelectedEventIds(newSelected);
        }
    };

    const handleApprovePayout = async (payout: Payout) => {
        if (!payout.is_verified) {
            showToast(`Critical Block: Recipient identity is NOT verified. Approve KYC first.`, 'error');
            return;
        }

        if (!confirm(`Are you sure you want to approve this payout for ${payout.recipient}? This will initiate disbursement.`)) return;
        
        try {
            const { data, error } = await supabase.functions.invoke('payout-fulfillment', {
                body: { payout_id: payout.id }
            });
            
            if (error || !data?.success) {
                throw new Error(error?.message || data?.error || 'Failed to initiate payout');
            }
            
            showToast('Payout successfully initiated.', 'success');
            fetchPayouts();
            fetchDashboardSummary();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleRejectPayout = async (reason: string) => {
        const isBulk = !pendingRejectPayout;
        const count = isBulk ? selectedPayoutIds.size : 1;
        
        showToast(`Rejecting ${count} payout(s)...`, 'info');
        try {
            if (isBulk) {
                const selectedPayoutsList = payouts.filter(p => selectedPayoutIds.has(p.id));
                const { error } = await supabase.rpc('bulk_reject_payouts', {
                    p_payout_ids: Array.from(selectedPayoutIds),
                    p_created_at_list: selectedPayoutsList.map(p => p.createdAt),
                    p_reason: reason
                });
                if (error) throw error;
                setSelectedPayoutIds(new Set());
            } else if (pendingRejectPayout) {
                const { error } = await supabase.rpc('reject_payout', {
                    p_payout_id: pendingRejectPayout.id,
                    p_created_at: pendingRejectPayout.createdAt,
                    p_reason: reason
                });
                if (error) throw error;
            }

            showToast(`${count > 1 ? 'Payouts' : 'Payout'} rejected and funds returned to escrow.`, 'success');
            setIsPayoutRejectModalOpen(false);
            setPendingRejectPayout(null);
            fetchPayouts();
            fetchDashboardSummary();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    // --- Global Actions ---

    const handleBulkStatusUpdate = async (newStatus: string) => {
        const confirmMsg = newStatus === 'rejected' ? 'Are you sure you want to REJECT the selected events?' : `Update ${selectedEventIds.size} events to ${newStatus}?`;
        if (!await confirm(confirmMsg, { title: 'Bulk Update' })) return;

        await executeAction(
            () => supabase.rpc('bulk_moderate_events', {
                p_event_ids: Array.from(selectedEventIds),
                p_status: newStatus,
                p_reason: `Bulk status update to ${newStatus} via Admin Dashboard.`
            }),
            {
                loadingMessage: `Updating ${selectedEventIds.size} events...`,
                successMessage: `Bulk update successful`,
                onSuccess: () => {
                    fetchEvents();
                    fetchDashboardSummary();
                    setSelectedEventIds(new Set());
                }
            }
        );
    };

    const handleBulkDelete = async () => {
        if (!await confirm(`Are you sure you want to delete ${selectedEventIds.size} events?`, { title: 'Delete Events', confirmLabel: 'Delete' })) return;
        
        await executeAction(
            async () => {
                const ids = Array.from(selectedEventIds);
                const results = await Promise.all(ids.map(id => 
                    supabase.rpc('admin_manage_event', {
                        p_action: 'delete',
                        p_id: id
                    })
                ));
                return { error: results.find(r => r.error)?.error || null };
            },
            {
                loadingMessage: `Deleting ${selectedEventIds.size} events...`,
                successMessage: `Deleted ${selectedEventIds.size} events`,
                onSuccess: () => {
                    fetchEvents();
                    fetchDashboardSummary();
                    setSelectedEventIds(new Set());
                }
            }
        );
    };

    const handleBulkForumStatusUpdate = async (newStatus: string) => {
        if (selectedForumIds.size === 0) return;

        if (!await confirm(`Update status of ${selectedForumIds.size} forums to ${newStatus}?`, { title: 'Bulk Forum Update' })) return;

        showToast(`Updating ${selectedForumIds.size} forums...`, 'info');
        try {
            const { error } = await supabase.rpc('bulk_update_forum_status', {
                p_forum_ids: Array.from(selectedForumIds),
                p_status: newStatus
            });

            if (error) throw error;

            showToast(`Successfully updated ${selectedForumIds.size} forums.`, 'success');
            fetchEvents();
            setSelectedForumIds(new Set());
        } catch (err) {
            showToast('Failed to perform bulk forum update.', 'error');
        }
    };

    const handleExportEventData = () => {
        const selectedEvents = events.filter(e => selectedEventIds.has(e.id));
        showToast(`Preparing data export for ${selectedEventIds.size} events...`, 'info');
        exportToCSV(selectedEvents, 'event_management_export');
        showToast('Export successful.', 'success');
        setSelectedEventIds(new Set());
    };

    const handleSingleStatusUpdate = async (event: Event, newStatus: string, reason?: string) => {
        // If it's a rejection, collect a reason via the modal first.
        if (newStatus === 'rejected' && !reason) {
            setPendingModerationItem({ id: event.id, title: event.title, status: newStatus });
            setIsRejectionModalOpen(true);
            return;
        }

        await executeAction(
            () => supabase.rpc('bulk_moderate_events', {
                p_event_ids: [event.id],
                p_status: newStatus,
                p_reason: reason || `Status updated to ${newStatus} via Admin Events dashboard.`
            }),
            {
                loadingMessage: `Updating ${event.title}...`,
                successMessage: `Status updated`,
                onSuccess: () => {
                    fetchEvents();
                    fetchDashboardSummary();
                    setIsRejectionModalOpen(false);
                }
            }
        );
    };

    const handleSingleDelete = async (event: Event) => {
        if (!await confirm(`Delete "${event.title}"?`, { title: 'Delete Event', confirmLabel: 'Delete' })) return;
        await executeAction(
            () => supabase.rpc('admin_manage_event', {
                p_action: 'delete',
                p_id: event.id
            }),
            {
                loadingMessage: `Deleting ${event.title}...`,
                successMessage: `${event.title} deleted`,
                onSuccess: () => {
                    fetchEvents();
                    fetchDashboardSummary();
                }
            }
        );
    };

    const bulkActions: BulkAction[] = [
        { label: 'Publish All', onClick: () => handleBulkStatusUpdate('published'), variant: 'success' },
        { label: 'Archive Selection', onClick: () => handleBulkStatusUpdate('archived') },
        { label: 'Reject Selection', onClick: () => handleBulkStatusUpdate('rejected'), variant: 'danger' },
        { label: 'Delete Selection', onClick: handleBulkDelete, variant: 'danger' },
        { label: 'Export Selection', onClick: handleExportEventData }
    ];

    return (
        <div className={styles.container}>
            {ConfirmDialog}
            <PageHeader
                title="Event Management" 
                subtitle="Review, approve and moderate events across the platform."
                actionLabel="Create Event"
                actionHref="/dashboard/admin/events/create"
                actionIcon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                        <line x1="12" y1="14" x2="12" y2="20"></line>
                        <line x1="9" y1="17" x2="15" y2="17"></line>
                    </svg>
                }
            />
            
            <div className={adminStyles.statsGrid}>
                <StatCard 
                    label="Active Events" 
                    value={summary?.events?.active || 0} 
                    change="Live now"
                    trend="positive"
                    isLoading={!summary} 
                />
                <StatCard 
                    label="Upcoming Events" 
                    value={summary?.events?.upcoming || 0} 
                    change="Next 30 days"
                    trend="neutral"
                    isLoading={!summary} 
                />
                <StatCard 
                    label="Pending Review" 
                    value={summary?.events?.pending || 0} 
                    change="Requires attention"
                    trend={(summary?.events?.pending || 0) > 0 ? "negative" : "positive"}
                    isLoading={!summary} 
                />
                <StatCard 
                    label="Flagged Events" 
                    value={summary?.events?.flagged || 0} 
                    change="Safety suspensions"
                    trend="negative"
                    isLoading={!summary} 
                />
            </div>

            <TableToolbar
                searchPlaceholder={
                    activeTab === 'payouts' ? "Search by reference or recipient..." :
                    activeTab === 'forums' ? "Search forum threads..." : "Search events or venues..."
                }
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                {activeTab === 'payouts' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                        <select 
                            className={adminStyles.select}
                            style={{ height: '40px' }}
                            value={payoutCountryFilter}
                            onChange={(e) => setPayoutCountryFilter(e.target.value)}
                        >
                            <option value="all">All Regions</option>
                            {countries.map(c => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                ) : (
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
                )}
            </TableToolbar>

            <BulkActionsBar
                selectedCount={selectedEventIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedEventIds(new Set())}
                itemTypeLabel="events"
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className={styles.mainTabs}>
                <div className={adminStyles.tabsHeaderRow}>
                    <TabsList>
                        <TabsTrigger value="events">Live Events</TabsTrigger>
                        <TabsTrigger value="forums">Community Forums</TabsTrigger>
                        <TabsTrigger value="ticketing">Ticketing Ops</TabsTrigger>
                        <TabsTrigger value="payouts">Payout Requests</TabsTrigger>
                    </TabsList>
                    
                    <div className={adminStyles.chipsWrapper}>
                        {activeTab === 'events' ? (
                            <FilterChips
                                options={[
                                    { value: 'all', label: 'All' },
                                    { value: 'draft', label: 'Draft' },
                                    { value: 'published', label: 'Published' },
                                    { value: 'active', label: 'Active' },
                                    { value: 'rejected', label: 'Rejected' },
                                    { value: 'completed', label: 'Completed' },
                                    { value: 'cancelled', label: 'Cancelled' },
                                    { value: 'suspended', label: 'Suspended' },
                                ]}
                                currentValue={statusFilter}
                                onChange={setStatusFilter}
                            />
                        ) : activeTab === 'forums' ? (
                            <FilterChips
                                options={[
                                    { value: 'all', label: 'All' },
                                    { value: 'open', label: 'Open' },
                                    { value: 'read_only', label: 'Read Only' },
                                    { value: 'archived', label: 'Archived' },
                                ]}
                                currentValue={forumStatusFilter}
                                onChange={setForumStatusFilter}
                            />
                        ) : null}
                    </div>
                </div>

                <TabsContent value="events">
                    <EventTable
                        mode="admin"
                        events={events}
                        isLoading={isLoading}
                        selectedIds={selectedEventIds}
                        onSelect={handleSelectEvent}
                        onSelectAll={handleSelectAll}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        onEdit={(event) => {
                            setSelectedEvent(event as Event);
                            setIsDetailModalOpen(true);
                        }}
                        onStatusChange={handleSingleStatusUpdate}
                        onDelete={handleSingleDelete}
                    />
                </TabsContent>

                <TabsContent value="forums">
                    <BulkActionsBar
                        selectedCount={selectedForumIds.size}
                        actions={[
                            { 
                                label: 'Open Selected', 
                                onClick: () => handleBulkForumStatusUpdate('open'),
                                variant: 'success'
                            },
                            { 
                                label: 'Make Read-only', 
                                onClick: () => handleBulkForumStatusUpdate('read_only'),
                                variant: 'default'
                            },
                            { 
                                label: 'Archive Selected', 
                                onClick: () => handleBulkForumStatusUpdate('archived'),
                                variant: 'danger'
                            }
                        ]}
                        onCancel={() => setSelectedForumIds(new Set())}
                        itemTypeLabel="forums"
                    />

                    <ForumTable
                        threads={threads}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        selectedIds={selectedForumIds}
                        onSelect={(id) => {
                            const next = new Set(selectedForumIds);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            setSelectedForumIds(next);
                        }}
                        onSelectAll={() => {
                            if (selectedForumIds.size === threads.length) {
                                setSelectedForumIds(new Set());
                            } else {
                                setSelectedForumIds(new Set(threads.map(t => t.id)));
                            }
                        }}
                        onEditForum={(thread) => {
                            const event = events.find(e => e.forum_id === thread.id);
                            if (event) {
                                setSelectedEvent(event);
                                setIsDetailModalOpen(true);
                            }
                        }}
                        onStatusChange={async (id, status) => {
                            const { error } = await supabase.rpc('admin_manage_forum', {
                                p_forum_id: id,
                                p_action: 'update_status',
                                p_payload: { status }
                            });
                            if (error) showToast(error.message, 'error');
                            else {
                                showToast('Forum status updated.', 'success');
                                fetchEvents();
                            }
                        }}
                    />
                </TabsContent>

                <TabsContent value="payouts">
                    <BulkActionsBar
                        selectedCount={selectedPayoutIds.size}
                        actions={[
                            {
                                label: 'Approve Selected',
                                onClick: async () => {
                                    if (!confirm(`Approve ${selectedPayoutIds.size} payouts?`)) return;
                                    try {
                                        const { error } = await supabase.rpc('bulk_approve_payouts', {
                                            p_payout_ids: Array.from(selectedPayoutIds)
                                        });
                                        if (error) throw error;
                                        showToast('Bulk approval initiated.', 'success');
                                        fetchPayouts();
                                        setSelectedPayoutIds(new Set());
                                    } catch (err: any) {
                                        showToast(err.message, 'error');
                                    }
                                },
                                variant: 'success'
                            },
                            {
                                label: 'Reject Selected',
                                onClick: () => {
                                    setPendingRejectPayout(null); // Bulk mode
                                    setIsPayoutRejectModalOpen(true);
                                },
                                variant: 'danger'
                            }
                        ]}
                        onCancel={() => setSelectedPayoutIds(new Set())}
                        itemTypeLabel="payouts"
                    />

                    <PayoutTable
                        payouts={payouts}
                        isLoading={isLoading}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        selectedIds={selectedPayoutIds}
                        onSelect={(id) => {
                            const next = new Set(selectedPayoutIds);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            setSelectedPayoutIds(next);
                        }}
                        onApprove={handleApprovePayout}
                        onReject={(payout) => {
                            setPendingRejectPayout(payout);
                            setIsPayoutRejectModalOpen(true);
                        }}
                    />
                </TabsContent>
            </Tabs>

            {selectedEvent && (
                <Modal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={`Event Management: ${selectedEvent.title}`}
                    size="large"
                >
                    <Tabs defaultValue="overview" className={styles.detailTabs}>
                        <TabsList style={{ width: 'fit-content' }}>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="ticketing">Ticketing & Resale</TabsTrigger>
                            <TabsTrigger value="community">Forum & Chat</TabsTrigger>
                            <TabsTrigger value="moderation">Moderation Queue</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview">
                            <div className={styles.detailGrid}>
                                <div className={styles.detailSection}>
                                    <h3>Basic Information</h3>
                                    <p><strong>Reference:</strong> {selectedEvent.eventReference}</p>
                                    <p><strong>Organizer:</strong> {selectedEvent.organizer}</p>
                                    <p><strong>Date:</strong> {selectedEvent.date} {selectedEvent.time}</p>
                                    <p><strong>Location:</strong> {selectedEvent.location}</p>
                                </div>
                                <div className={styles.detailSection}>
                                    <h3>Performance</h3>
                                    <p><strong>Attendees:</strong> {selectedEvent.attendees}</p>
                                    <p><strong>Total Reports:</strong> {selectedEvent.reportsCount}</p>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="ticketing">
                            <TicketingTab eventId={selectedEvent.id} />
                        </TabsContent>

                        <TabsContent value="community">
                            {selectedEvent.forum_id ? (
                                <ForumMessagesTab forumId={selectedEvent.forum_id} />
                            ) : (
                                <div className={styles.emptyState}>No forum exists for this event.</div>
                            )}
                        </TabsContent>

                        <TabsContent value="moderation">
                            <EventReportsSection eventId={selectedEvent.id} />
                        </TabsContent>
                    </Tabs>
                </Modal>
            )}

            <RejectionModal
                isOpen={isRejectionModalOpen}
                onClose={() => setIsRejectionModalOpen(false)}
                onConfirm={(reason) => {
                    const event = events.find(e => e.id === pendingModerationItem?.id);
                    if (event) {
                        handleSingleStatusUpdate(event, pendingModerationItem?.status || 'rejected', reason);
                    }
                }}
                title={`Reject Event: ${pendingModerationItem?.title}`}
            />
        </div>
    );
}
