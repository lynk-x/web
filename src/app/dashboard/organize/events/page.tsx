"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import EventTable, { Event } from '@/components/organize/EventTable';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar from '@/components/shared/BulkActionsBar';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import type { OrganizerEvent } from '@/types/organize';

// Main Component
export default function OrganizerEventsPage() {
    const { showToast } = useToast();
    const router = useRouter();
    const supabase = createClient();
    const { activeAccount, isLoading: isOrgLoading, accounts } = useOrganization();

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
    const [itemsPerPage] = useState(2); // Reduced for pagination visibility
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Initialization & Data Fetching
    useEffect(() => {
        if (!isOrgLoading) {
            if (activeAccount) {
                fetchEvents();
            } else {
                // Load mock data if no active account
                setEvents([
                    { id: '1', title: 'Summer Festival 2024', organizer: 'Organization', date: 'Aug 15, 2024, 08:00 PM', location: 'Central Park', status: 'active', attendees: 1540 },
                    { id: '2', title: 'Tech Startup Mixer', organizer: 'Organization', date: 'Sep 10, 2024, 06:00 PM', location: 'Innovation Hub', status: 'published', attendees: 0 },
                    { id: '3', title: 'Winter Gala', organizer: 'Organization', date: 'Dec 05, 2024, 07:00 PM', location: 'Grand Hotel', status: 'draft', attendees: 0 }
                ] as OrganizerEvent[]);
                setIsLoadingEvents(false);
            }
        }
    }, [isOrgLoading, activeAccount]);

    const fetchEvents = async () => {
        setIsLoadingEvents(true);
        try {
            const { data, error } = await supabase
                .from('public_events_view')
                .select('*')
                .eq('account_id', activeAccount?.id);

            if (error) throw error;

            // Map DB format to OrganizerEvent table format
            const formattedEvents: OrganizerEvent[] = (data || []).map(e => {
                // Determine table status from db event_status ('draft', 'published', 'completed', etc)
                // In a real app we'd unify these types, but for now we map them for the UI table
                let uiStatus: OrganizerEvent['status'] = 'active';
                if (e.status === 'draft') uiStatus = 'draft';
                if (e.status === 'completed' || e.status === 'archived') uiStatus = 'completed';

                return {
                    id: e.id,
                    title: e.title,
                    organizer: e.organizer_name || 'Organization',
                    date: new Date(e.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
                    location: e.location_name,
                    status: uiStatus,
                    attendees: 0, // Fallback until we aggregate ticket sales
                    thumbnailUrl: e.cover_image_url
                };
            });

            setEvents(formattedEvents);
        } catch (error) {
            console.error("Error fetching events:", error);
            showToast('Failed to load events.', 'error');
        } finally {
            setIsLoadingEvents(false);
        }
    };

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
        } else if (action === 'duplicate') {
            showToast(`Duplicating ${selectedIds.size} events...`, 'info');
            // Simulate API call
            setTimeout(() => {
                showToast('Events duplicated successfully!', 'success');
                setSelectedIds(new Set());
            }, 1000);
        }
    };

    const confirmDelete = async () => {
        showToast('Processing deletion...', 'info');
        try {
            // Delete from events table directly (triggers will cascade where safe, or reject where RESTRICTED)
            const { error } = await supabase
                .from('events')
                .delete()
                .in('id', Array.from(selectedIds));

            if (error) throw error;

            showToast(`Successfully deleted ${selectedIds.size} events.`, 'success');
            setSelectedIds(new Set());
            fetchEvents(); // Reload
        } catch (error: any) {
            console.error("Delete failed:", error);
            showToast(error.message || 'Failed to delete events. Check if tickets have been sold.', 'error');
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
        } catch (error: any) {
            console.error("Status update failed:", error);
            showToast('Failed to update event status.', 'error');
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
        <div className={styles.dashboardPage}>
            {/* Header */}
            <header className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>My Events</h1>
                    <p className={styles.pageSubtitle}>Manage and track all your scheduled events.</p>
                </div>
                <button className={styles.primaryBtn} onClick={() => console.log('Create Event')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Create Event
                </button>
            </header>

            {/* Toolbar */}
            <TableToolbar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search events..."
            >
                <div className={styles.toolbarContainer}>
                    {['all', 'active', 'draft', 'past'].map((tab) => {
                        const isActive = statusFilter === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => { setStatusFilter(tab as any); setCurrentPage(1); }}
                                className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
                            >
                                {tab === 'draft' ? 'Drafts' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        );
                    })}
                </div>

                <div className={styles.filterGroup}>
                    <select
                        className={styles.filterSelect}
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="all">All Categories</option>
                        <option value="music">Music</option>
                        <option value="tech">Technology</option>
                        <option value="sports">Sports</option>
                    </select>
                </div>
            </TableToolbar>

            {/* Bulk Actions */}
            <BulkActionsBar
                selectedCount={selectedIds.size}
                onCancel={() => setSelectedIds(new Set())}
                actions={[
                    { label: 'Attendee List', onClick: () => showToast(`Generating attendee list for ${selectedIds.size} events...`, 'info'), variant: 'default' },
                    { label: 'Delete', onClick: () => handleBulkAction('delete'), variant: 'danger' },
                    { label: 'Duplicate', onClick: () => handleBulkAction('duplicate'), variant: 'default' }
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


