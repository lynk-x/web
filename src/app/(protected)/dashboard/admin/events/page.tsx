"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

export default function AdminEventsPage() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const router = useRouter();

    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
    const [summary, setSummary] = useState<any>(null);

    const debouncedSearch = useDebounce(searchTerm, 500);
    const itemsPerPage = 10;

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
            setEvents((data || []).map((e: any) => ({
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
                reportsCount: e.reports_count || 0
            })));
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
        showToast(`Updating ${selectedEventIds.size} events to ${newStatus}...`, 'info');
        try {
            const { error } = await supabase.rpc('bulk_moderate_events', {
                p_event_ids: Array.from(selectedEventIds),
                p_status: newStatus,
                p_reason: `Bulk status update to ${newStatus} via Admin Dashboard.`
            });

            if (error) throw error;

            showToast(`Successfully moved ${selectedEventIds.size} events to ${newStatus}.`, 'success');
            fetchEvents();
            fetchDashboardSummary();
            setSelectedEventIds(new Set());
        } catch (err) {
            showToast('Failed to update events.', 'error');
        }
    };

    const handleBulkDelete = async () => {
        if (!await confirm(`Are you sure you want to delete ${selectedEventIds.size} events?`, { title: 'Delete Events', confirmLabel: 'Delete' })) return;
        showToast(`Deleting ${selectedEventIds.size} events...`, 'info');
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .in('id', Array.from(selectedEventIds));

            if (error) throw error;

            showToast(`Deleted ${selectedEventIds.size} events.`, 'success');
            fetchEvents();
            fetchDashboardSummary();
            setSelectedEventIds(new Set());
        } catch (err) {
            showToast('Failed to delete events.', 'error');
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

        showToast(`Updating ${event.title} to ${newStatus}...`, 'info');
        try {
            // For approval/rejection, use the secure moderate_item RPC which needs the
            // moderation table's own UUID (not the event ID). Look it up first.
            if (newStatus === 'active' || newStatus === 'rejected') {
                const { data: modRow } = await supabase
                    .from('moderation')
                    .select('id')
                    .eq('item_id', event.id)
                    .eq('item_type', 'event')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (!modRow) {
                    // No moderation record exists yet — fall back to direct update
                    const { error } = await supabase
                        .from('events')
                        .update({ status: newStatus as any, updated_at: new Date().toISOString() })
                        .eq('id', event.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.rpc('moderate_item', {
                        p_moderation_id: modRow.id,
                        p_status: newStatus === 'active' ? 'approved' : 'rejected',
                        p_reason: reason || 'Status updated via Admin Events dashboard.'
                    });
                    if (error) throw error;
                }
            } else {
                // Non-moderation status changes (archive, cancel, etc.) update the table directly
                const { error } = await supabase
                    .from('events')
                    .update({ status: newStatus as any, updated_at: new Date().toISOString() })
                    .eq('id', event.id);
                if (error) throw error;
            }

            showToast(`${event.title} status updated.`, 'success');
            fetchEvents();
            fetchDashboardSummary();
            setIsRejectionModalOpen(false);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to update event status.', 'error');
        }
    };

    const handleSingleDelete = async (event: Event) => {
        if (!await confirm(`Delete "${event.title}"?`, { title: 'Delete Event', confirmLabel: 'Delete' })) return;
        showToast(`Deleting ${event.title}...`, 'info');
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', event.id);

            if (error) throw error;

            showToast(`${event.title} deleted.`, 'success');
            fetchEvents();
            fetchDashboardSummary();
        } catch (err) {
            showToast('Failed to delete event.', 'error');
        }
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
                subtitle="Review, approve, and moderate events across the platform."
            />
            
            <div className={adminStyles.statsGrid}>
                <StatCard 
                    label="Total Events" 
                    value={summary?.total_events || 0} 
                    change="Platform wide"
                    isLoading={!summary} 
                />
                <StatCard 
                    label="Active Events" 
                    value={summary?.active_events || 0} 
                    change="Live now"
                    trend="positive"
                    isLoading={!summary} 
                />
                <StatCard 
                    label="Pending Review" 
                    value={summary?.pending_moderation || 0} 
                    change="Requires attention"
                    trend={summary?.pending_moderation > 0 ? "negative" : "positive"}
                    isLoading={!summary} 
                />
                <StatCard 
                    label="Total Organizers" 
                    value={summary?.total_organizers || 0} 
                    change="Verified partners"
                    trend="neutral"
                    isLoading={!summary} 
                />
            </div>

            <TableToolbar
                searchPlaceholder="Search events or organizers..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                        { value: 'all', label: 'All' },
                        { value: 'draft', label: 'Draft' },
                        { value: 'published', label: 'Published' },
                        { value: 'active', label: 'Active' },
                        { value: 'rejected', label: 'Rejected' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'cancelled', label: 'Cancelled' },
                        { value: 'suspended', label: 'Suspended' },
                    ].map(({ value, label }) => (
                        <button
                            key={value}
                            className={`${adminStyles.chip} ${statusFilter === value ? adminStyles.chipActive : ''}`}
                            onClick={() => setStatusFilter(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </TableToolbar>

            <BulkActionsBar
                selectedCount={selectedEventIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedEventIds(new Set())}
                itemTypeLabel="events"
            />

            {isLoading ? (
                <div style={{ padding: '60px', textAlign: 'center', opacity: 0.6 }}>Loading events...</div>
            ) : (
                <EventTable
                    events={events}
                    selectedIds={selectedEventIds}
                    onSelect={handleSelectEvent}
                    onSelectAll={handleSelectAll}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    onEdit={(event) => router.push(`/dashboard/admin/events/${event.id}/edit`)}
                    onStatusChange={handleSingleStatusUpdate}
                    onDelete={handleSingleDelete}
                />
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
