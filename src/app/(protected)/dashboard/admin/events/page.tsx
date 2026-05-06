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

export default function AdminEventsPage() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const { executeAction } = useModerationAction();
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
            () => supabase
                .from('events')
                .delete()
                .in('id', Array.from(selectedEventIds)),
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
            async () => {
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
                        return supabase
                            .from('events')
                            .update({ status: newStatus as any, updated_at: new Date().toISOString() })
                            .eq('id', event.id);
                    } else {
                        return supabase.rpc('moderate_item', {
                            p_moderation_id: modRow.id,
                            p_status: newStatus === 'active' ? 'approved' : 'rejected',
                            p_reason: reason || 'Status updated via Admin Events dashboard.'
                        });
                    }
                } else {
                    return supabase
                        .from('events')
                        .update({ status: newStatus as any, updated_at: new Date().toISOString() })
                        .eq('id', event.id);
                }
            },
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
            () => supabase
                .from('events')
                .delete()
                .eq('id', event.id),
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
                subtitle="Review, approve, and moderate events across the platform."
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
