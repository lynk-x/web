"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import EventTable, { Event } from '@/components/organize/EventTable';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar from '@/components/shared/BulkActionsBar';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import FilterGroup from '@/components/dashboard/FilterGroup';
import { createClient } from '@/utils/supabase/client';
import type { OrganizerEvent } from '@/types/organize';

// Main Component
export default function OrganizerEventsPage() {
    const { showToast } = useToast();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();

    // Data State
    const [events, setEvents] = useState<OrganizerEvent[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);

    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Filter States
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'past'>('all');
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
            // Query events table directly — joined with ticket_tiers for sell-through data
            const { data, error } = await supabase
                .from('events')
                .select(`
                    id, title, status, starts_at, location_name, attendee_count,
                    thumbnail_url,
                    ticket_tiers(quantity_sold, quantity_total)
                `)
                .eq('account_id', activeAccount.id)
                .order('starts_at', { ascending: false });

            if (error) throw error;

            const formattedEvents: OrganizerEvent[] = (data || []).map((e: any) => {
                // Map event_status enum to simplified UI status
                let uiStatus: OrganizerEvent['status'] = 'active';
                if (e.status === 'draft') uiStatus = 'draft';
                if (['completed', 'archived', 'cancelled'].includes(e.status)) uiStatus = 'completed';

                const ticketsSold = (e.ticket_tiers || []).reduce((acc: number, t: any) => acc + (t.quantity_sold || 0), 0);

                return {
                    id: e.id,
                    title: e.title,
                    organizer: activeAccount.name,
                    date: new Date(e.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
                    location: e.location_name || 'TBD',
                    status: uiStatus,
                    attendees: e.attendee_count || ticketsSold,
                    thumbnailUrl: e.thumbnail_url
                };
            });

            setEvents(formattedEvents);
        } catch (err: any) {
            showToast(err.message || 'Failed to load events.', 'error');
        } finally {
            setIsLoadingEvents(false);
        }
    }, [activeAccount, supabase, showToast]);

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

    // Filter Logic
    const filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.location.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all'
            ? true
            : statusFilter === 'draft'
                ? event.status === 'draft'
                : statusFilter === 'past'
                    ? event.status === 'completed' || event.status === 'archived' || event.status === 'cancelled'
                    : event.status === 'active' || event.status === 'published';

        return matchesSearch && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
    const paginatedEvents = filteredEvents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

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

    const handleBulkAction = (action: string) => {
        if (action === 'delete') {
            setIsDeleteModalOpen(true);
        }
        // Note: duplicate is not yet implemented
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
        } catch (err: any) {
            showToast(err.message || 'Failed to delete events. Events with sold tickets cannot be deleted.', 'error');
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    // --- Row Actions ---
    const handleEdit = (event: OrganizerEvent) => {
        router.push(`/dashboard/organize/events/edit/${event.id}`);
    };

    const handleStatusChange = async (event: OrganizerEvent, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('events')
                .update({ status: newStatus })
                .eq('id', event.id);

            if (error) throw error;
            showToast(`Event status updated to ${newStatus}.`, 'success');
            fetchEvents();
        } catch (err: any) {
            showToast(err.message || 'Failed to update event status.', 'error');
        }
    };

    const handleDeleteSingle = (event: OrganizerEvent) => {
        setSelectedIds(new Set([event.id]));
        setIsDeleteModalOpen(true);
    };

    if (isOrgLoading || isLoadingEvents) {
        return <div className={styles.dashboardPage} style={{ padding: '40px' }}>Loading Dashboard...</div>;
    }

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
            <TableToolbar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search events..."
            >
                <FilterGroup
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'active', label: 'Active' },
                        { value: 'draft', label: 'Drafts' },
                        { value: 'past', label: 'Past' },
                    ]}
                    currentValue={statusFilter}
                    onChange={(val) => { setStatusFilter(val as any); setCurrentPage(1); }}
                />
            </TableToolbar>

            {/* Bulk Actions */}
            <BulkActionsBar
                selectedCount={selectedIds.size}
                onCancel={() => setSelectedIds(new Set())}
                actions={[
                    { label: 'Attendee List', onClick: () => showToast('Attendee list export coming soon.', 'info'), variant: 'default' },
                    { label: 'Delete', onClick: () => handleBulkAction('delete'), variant: 'danger' }
                ]}
            />

            {/* Table */}
            <div className={styles.tableWrapper}>
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
                    onStatusChange={handleStatusChange as any}
                />
            </div>

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
        </div>
    );
}


