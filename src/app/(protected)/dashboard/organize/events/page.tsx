"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import EventTable, { Event } from '@/components/features/events/EventTable';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import EventCancellationModal from '@/components/features/events/EventCancellationModal';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import FilterGroup from '@/components/dashboard/FilterGroup';
import { createClient } from '@/utils/supabase/client';
import type { OrganizerEvent } from '@/types/organize';
import { exportToCSV } from '@/utils/export';
import { formatDate, formatDateTime, formatTime } from '@/utils/format';
import ProductTour from '@/components/dashboard/ProductTour';

// Main Component
export default function OrganizerEventsPage() {
    const { showToast } = useToast();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();

    // Data State
    const [events, setEvents] = useState<OrganizerEvent[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);

    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    // Cancellation modal: stores the event to cancel + how many tickets were sold
    const [cancelTarget, setCancelTarget] = useState<{ event: OrganizerEvent; ticketsSold: number } | null>(null);

    // Filter States
    const [statusFilter, setStatusFilter] = useState<'all' | OrganizerEvent['status']>('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // ── fetchEvents ─────────────────────────────────────────────────────────
    const fetchEvents = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoadingEvents(true);
        try {
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            let query = supabase
                .from('events')
                .select(`
                    id, title, status, starts_at, media, location,
                    reference, is_private, currency,
                    ticket_tiers(tickets_sold, capacity)
                `, { count: 'exact' })
                .eq('account_id', activeAccount.id)
                .order('starts_at', { ascending: false })
                .range(from, to);

            if (searchTerm) {
                query = query.or(`title.ilike.%${searchTerm}%`);
            }
            if (statusFilter !== 'all') query = query.eq('status', statusFilter);

            const { data, error, count } = await query;

            if (error) throw error;

            const formattedEvents: OrganizerEvent[] = (data || []).map((e: any) => {
                const uiStatus = e.status as OrganizerEvent['status'];
                const ticketsSold = (e.ticket_tiers || []).reduce((acc: number, t: any) => acc + (t.tickets_sold || 0), 0);

                return {
                    id: e.id,
                    title: e.title,
                    organizer: activeAccount.name,
                    date: formatDate(e.starts_at),
                    endDate: e.ends_at ? formatDate(e.ends_at) : undefined,
                    time: formatTime(e.starts_at),
                    endTime: e.ends_at ? formatTime(e.ends_at) : undefined,
                    location: (e.location as any)?.name || 'TBD',
                    status: uiStatus,
                    attendees: ticketsSold,
                    thumbnailUrl: (e.media as any)?.thumbnail,
                    eventReference: e.reference,
                    isPrivate: e.is_private,
                    currency: e.currency
                };
            });

            setEvents(formattedEvents);
            setTotalCount(count ?? 0);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load events.', 'error');
        } finally {
            setIsLoadingEvents(false);
        }
    }, [activeAccount, supabase, showToast, currentPage, itemsPerPage, searchTerm, statusFilter]);

    // ── Initialization & Data Fetching ───────────────────────────────────────
    useEffect(() => {
        if (!isOrgLoading) {
            if (activeAccount) {
                fetchEvents();
            } else {
                setEvents([]);
                setIsLoadingEvents(false);
            }
        }
    }, [isOrgLoading, activeAccount, fetchEvents]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const paginatedEvents = events;

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set());
    }, [searchTerm, statusFilter]);

    // Selection Logic
    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === paginatedEvents.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedEvents.map(e => e.id)));
        }
    };

    const handleDuplicate = async (eventId: string) => {
        showToast('Cloning event...', 'info');
        try {
            const { data: newId, error } = await supabase.rpc('duplicate_event', {
                p_event_id: eventId
            });
            if (error) throw error;
            showToast('Event duplicated to draft.', 'success');
            fetchEvents();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Duplication failed', 'error');
        }
    };

    const handleBulkDuplicate = async () => {
        if (selectedIds.size === 0) return;
        showToast(`Cloning ${selectedIds.size} events...`, 'info');
        try {
            const { data, error } = await supabase.rpc('bulk_duplicate_events', {
                p_event_ids: Array.from(selectedIds)
            });
            if (error) throw error;
            showToast(`Batch duplication complete: ${data.processed_count} events added to drafts.`, 'success');
            setSelectedIds(new Set());
            fetchEvents();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Bulk duplication failed', 'error');
        }
    };

    const handleBulkAction = (action: string) => {
        if (action === 'delete') {
            setIsDeleteModalOpen(true);
        } else if (action === 'duplicate') {
            handleBulkDuplicate();
        } else if (action === 'publish' || action === 'draft') {
            handleBulkStatusUpdate(action === 'publish' ? 'published' : 'draft');
        } else if (action === 'export') {
            handleBulkExport();
        }
    };

    const handleBulkStatusUpdate = async (newStatus: string) => {
        showToast(`Updating ${selectedIds.size} events...`, 'info');
        try {
            const { error } = await supabase.rpc('bulk_update_event_status', {
                event_ids: Array.from(selectedIds),
                new_status: newStatus
            });
            if (error) throw error;
            showToast(`Successfully updated ${selectedIds.size} events to ${newStatus}.`, 'success');
            setSelectedIds(new Set());
            fetchEvents();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to update events.', 'error');
        }
    };

    const handleBulkExport = async () => {
        showToast('Preparing attendee list...', 'info');
        try {
            // Fetch tickets for selected events with user profiles
            const { data, error } = await supabase
                .schema('tickets')
                .from('tickets')
                .select(`
                    id,
                    ticket_code,
                    status,
                    created_at,
                    event:events(title),
                    tier:ticket_tiers(display_name),
                    user:user_profile(full_name, email, user_name)
                `)
                .in('event_id', Array.from(selectedIds));

            if (error) throw error;

            if (!data || data.length === 0) {
                showToast('No attendees found for selected events.', 'warning');
                return;
            }

            const exportData = (data || []).map((t: any) => ({
                'Event': t.event?.title,
                'Attendee Name': t.user?.full_name || t.user?.user_name || 'Anonymous',
                'Email': t.user?.email,
                'Ticket Code': t.ticket_code,
                'Tier': t.tier?.display_name,
                'Status': t.status,
                'Purchased At': formatDateTime(t.created_at)
            }));

            exportToCSV(exportData, `attendee_list_${new Date().toISOString().split('T')[0]}`);
            showToast('Attendee list exported successfully.', 'success');
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to export attendee list.', 'error');
        }
    };

    const confirmDelete = async () => {
        showToast('Processing deletion...', 'info');
        try {
            // Delete from events table — DB constraints will reject if tickets have been sold
            const { error } = await supabase
                .from('events')
                .delete()
                .in('id', Array.from(selectedIds));

            if (error) throw error;

            showToast(`Successfully deleted ${selectedIds.size} events.`, 'success');
            setSelectedIds(new Set());
            fetchEvents();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to delete events. Events with sold tickets cannot be deleted.', 'error');
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    // ── Cancellation ───────────────────────────────────────────────────────────
    const handleCancelEvent = async (reason: string) => {
        if (!cancelTarget) return;

        try {
            const { error: rpcError } = await supabase.rpc('bulk_refund_event_tickets', {
                p_event_id: cancelTarget.event.id,
                p_reason: reason
            });

            if (rpcError) throw rpcError;

            // Flip the event status
            const { error: updateError } = await supabase
                .from('events')
                .update({
                    status: 'cancelled',
                    cancellation_reason: reason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', cancelTarget.event.id);

            if (updateError) throw updateError;

            showToast(`"${cancelTarget.event.title}" has been cancelled and tickets were refunded.`, 'success');
            setCancelTarget(null);
            fetchEvents();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to cancel event and process refunds.', 'error');
        }
    };

    const handleEdit = (event: OrganizerEvent) => {
        router.push(`/dashboard/organize/events/edit/${event.id}`);
    };

    const handleStatusChange = async (event: OrganizerEvent, newStatus: string) => {
        // Route cancellations through the modal so a reason is always captured
        if (newStatus === 'cancelled') {
            setCancelTarget({ event, ticketsSold: event.attendees || 0 });
            return;
        }
        try {
            const { error } = await supabase
                .from('events')
                .update({ status: newStatus })
                .eq('id', event.id);

            if (error) throw error;
            showToast(`Event status updated to ${newStatus}.`, 'success');
            fetchEvents();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to update event status.', 'error');
        }
    };

    const handleDeleteSingle = (event: OrganizerEvent) => {
        setSelectedIds(new Set([event.id]));
        setIsDeleteModalOpen(true);
    };

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="My Events"
                subtitle="Manage and track all your scheduled events."
                actionLabel="Create Event"
                onActionClick={() => router.push('/dashboard/organize/events/create')}
                actionIcon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                }
            />

            {/* Toolbar */}
            <div className="tour-events-filter">
                <TableToolbar
                    searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search events..."
            >
                <FilterGroup
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'draft', label: 'Draft' },
                        { value: 'published', label: 'Published' },
                        { value: 'active', label: 'Active' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'cancelled', label: 'Cancelled' },
                        { value: 'suspended', label: 'Suspended' }
                    ]}
                    currentValue={statusFilter}
                    onChange={(val) => setStatusFilter(val as any)}
                />
                </TableToolbar>
            </div>

            {/* Bulk Actions */}
            <div className="tour-bulk-actions">
                <BulkActionsBar
                    selectedCount={selectedIds.size}
                    onCancel={() => setSelectedIds(new Set())}
                    actions={[
                        { label: 'Duplicate Selected', onClick: () => handleBulkAction('duplicate'), variant: 'default' },
                        { label: 'Publish Selected', onClick: () => handleBulkAction('publish'), variant: 'default' },
                        { label: 'Delete Selected', onClick: () => handleBulkAction('delete'), variant: 'danger' }
                    ]}
                />
            </div>

            {/* Table */}
            <EventTable
                events={paginatedEvents}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onEdit={handleEdit}
                onDelete={handleDeleteSingle}
                onDuplicate={handleDuplicate}
                onStatusChange={handleStatusChange}
                isLoading={isLoadingEvents}
                className="tour-events-table"
            />

            {/* Modals */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Events?"
                message={`Are you sure you want to delete ${selectedIds.size} selected event(s)? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
            />
            {/* Cancellation modal */}
            {cancelTarget && (
                <EventCancellationModal
                    eventTitle={cancelTarget.event.title}
                    eventId={cancelTarget.event.id}
                    ticketsSold={cancelTarget.ticketsSold}
                    onClose={() => setCancelTarget(null)}
                    onConfirm={handleCancelEvent}
                />
            )}

            <ProductTour
                storageKey={activeAccount ? `hasSeenOrgEventsJoyride_${activeAccount.id}` : 'hasSeenOrgEventsJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Manage Your Events',
                        content: 'This is where you can view, edit and manage all your Lynk-X events. You can see their status, dates and ticket sales at a glance.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-events-filter',
                        title: 'Filter & Search',
                        content: 'Quickly find specific events by status (Draft, Published, Active) or search by name.',
                    },
                    {
                        target: '.tour-events-table',
                        title: 'Event List',
                        content: 'View details for each event. Use the checkboxes to select multiple events for bulk actions.',
                    },
                    {
                        target: '.tour-bulk-actions',
                        title: 'Management Actions',
                        content: 'Perform bulk actions like duplicating, publishing or deleting selected events.',
                    },
                ]}
            />
        </div>
    );
}

