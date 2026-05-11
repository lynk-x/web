"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StatusFilterChips from '@/components/shared/StatusFilterChips';
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
import { formatRelativeTime } from '@/utils/format';

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
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
    const [summary, setSummary] = useState<any>(null);

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

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_events', {
                p_search: debouncedSearch,
                p_status: statusFilter,
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
                    title: `${e.event_title} Community`,
                    eventName: e.event_title,
                    messageCount: Number(e.message_count || 0),
                    mediaCount: Number(e.media_count || 0),
                    reportsCount: Number(e.reports_count || 0),
                    escalatedCount: Number(e.escalated_reports_count || 0),
                    oldestReportAt: undefined, // Would need joining in RPC for exact date
                    status: (e.forum_status || 'open') as any,
                    lastActivity: 'Recent',
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

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        fetchDashboardSummary();
    }, [fetchDashboardSummary]);

    // Reset page on search/filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, statusFilter]);

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
                searchPlaceholder="Search events or organizers..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <StatusFilterChips
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
            </TableToolbar>

            <BulkActionsBar
                selectedCount={selectedEventIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedEventIds(new Set())}
                itemTypeLabel="events"
            />

            <Tabs defaultValue="events" className={styles.mainTabs}>
                <TabsList>
                    <TabsTrigger value="events">Events</TabsTrigger>
                    <TabsTrigger value="forums">Communities</TabsTrigger>
                </TabsList>

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
                    <ForumTable
                        threads={threads}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
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
            </Tabs>

            {selectedEvent && (
                <Modal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={`Event Management: ${selectedEvent.title}`}
                    size="large"
                >
                    <Tabs defaultValue="overview" className={styles.detailTabs}>
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="ticketing">Ticketing & Resale</TabsTrigger>
                            <TabsTrigger value="community">Community & Chat</TabsTrigger>
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
