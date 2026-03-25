"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';
import adminStyles from '../page.module.css';
import EventTable, { Event } from '@/components/organize/EventTable';

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import { exportToCSV } from '@/utils/export';
import { createClient } from '@/utils/supabase/client';
import { formatDate, formatTime } from '@/utils/format';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';

export default function AdminEventsPage() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [counts, setCounts] = useState({ organizers: 0 });
    const itemsPerPage = 8;

    useEffect(() => {
        const fetchEvents = async () => {
            setIsLoading(true);
            try {
                const [perfRes, organizersRes] = await Promise.all([
                    supabase.schema('analytics').from('mv_event_performance').select('*').order('starts_at', { ascending: false }),
                    supabase.from('accounts').select('*', { count: 'exact', head: true })
                ]);

                if (perfRes.error) throw perfRes.error;

                const data = perfRes.data;
                setCounts({ organizers: organizersRes.count || 0 });

                const mappedEvents: Event[] = (data || []).map((e: any) => ({
                    id: e.id,
                    title: e.event_title,
                    organizer: e.account_name || 'Unknown',
                    date: formatDate(e.starts_at),
                    time: formatTime(e.starts_at),
                    location: e.location_name || (e.is_private ? 'Private' : 'TBA'),
                    status: e.status,
                    attendees: e.attendee_count || 0,
                    eventCode: e.reference,
                    isPrivate: e.is_private,
                    thumbnailUrl: e.thumbnail_url,
                    reportsCount: e.reports_count || 0
                }));

                setEvents(mappedEvents);
            } catch (err) {
                console.error('Error fetching events:', err);
                showToast('Failed to load events.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvents();
    }, [supabase, showToast]);

    // Filter Logic
    const filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.organizer.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
    const paginatedEvents = filteredEvents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedEventIds(new Set()); // Clear selection on filter change
    }, [searchTerm, statusFilter]);

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
        if (selectedEventIds.size === paginatedEvents.length) {
            setSelectedEventIds(new Set());
        } else {
            const newSelected = new Set(selectedEventIds);
            paginatedEvents.forEach(event => newSelected.add(event.id));
            setSelectedEventIds(newSelected);
        }
    };

    // --- Global Actions ---

    const handleBulkStatusUpdate = async (newStatus: string) => {
        showToast(`Updating ${selectedEventIds.size} events to ${newStatus}...`, 'info');
        try {
            const { error } = await supabase
                .from('events')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .in('id', Array.from(selectedEventIds));

            if (error) throw error;

            showToast(`Successfully moved ${selectedEventIds.size} events to ${newStatus}.`, 'success');
            setEvents(prev => prev.map(e =>
                selectedEventIds.has(e.id) ? { ...e, status: newStatus as 'draft' | 'published' | 'completed' } : e
            ));
            setSelectedEventIds(new Set());
        } catch (err) {
            showToast('Failed to update events.', 'error');
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedEventIds.size} events?`)) return;
        showToast(`Deleting ${selectedEventIds.size} events...`, 'info');
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .in('id', Array.from(selectedEventIds));

            if (error) throw error;

            showToast(`Deleted ${selectedEventIds.size} events.`, 'success');
            setEvents(prev => prev.filter(e => !selectedEventIds.has(e.id)));
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

    const bulkActions: BulkAction[] = [
        { label: 'Publish All', onClick: () => handleBulkStatusUpdate('published'), variant: 'success' },
        { label: 'Mark Active', onClick: () => handleBulkStatusUpdate('active') },
        { label: 'Archive Selection', onClick: () => handleBulkStatusUpdate('archived') },
        { label: 'Delete Selection', onClick: handleBulkDelete, variant: 'danger' },
        { label: 'Export Selection', onClick: handleExportEventData }
    ];

    const stats = useMemo(() => {
        const total = events.length;
        const attendees = events.reduce((acc, e) => acc + (e.attendees || 0), 0);
        const reported = events.reduce((acc, e) => acc + (e.reportsCount || 0), 0);

        return { total, attendees, reported, organizers: counts.organizers };
    }, [events, counts.organizers]);

    const handleSingleStatusUpdate = async (event: Event, newStatus: string) => {
        showToast(`Moving ${event.title} to ${newStatus}...`, 'info');
        try {
            const { error } = await supabase
                .from('events')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', event.id);

            if (error) throw error;

            showToast(`${event.title} status updated.`, 'success');
            setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: newStatus as 'draft' | 'published' | 'completed' } : e));
        } catch (err) {
            showToast('Failed to update event status.', 'error');
        }
    };

    const handleSingleDelete = async (event: Event) => {
        if (!confirm(`Are you sure you want to delete ${event.title}?`)) return;
        showToast(`Deleting ${event.title}...`, 'info');
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', event.id);

            if (error) throw error;

            showToast(`${event.title} deleted.`, 'success');
            setEvents(prev => prev.filter(e => e.id !== event.id));
        } catch (err) {
            showToast('Failed to delete event.', 'error');
        }
    };

    return (
        <div className={styles.container}>
            <PageHeader 
                title="Event Management" 
                subtitle="Review, approve, and moderate events across the platform."
                actionLabel="Create Event"
                actionHref="/dashboard/admin/events/create"
                actionIcon={(
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            />
            
            <div className={adminStyles.statsGrid}>
                <StatCard 
                    label="Total Events" 
                    value={stats.total} 
                    change="Platform wide"
                    isLoading={isLoading} 
                />
                <StatCard 
                    label="Flagged Reports" 
                    value={stats.reported} 
                    change="Requires attention"
                    trend={stats.reported > 0 ? "negative" : "positive"}
                    isLoading={isLoading} 
                />
                <StatCard 
                    label="Total Organizers" 
                    value={stats.organizers} 
                    change="Verified partners"
                    trend="positive"
                    isLoading={isLoading} 
                />
                <StatCard 
                    label="Total Attendees" 
                    value={stats.attendees} 
                    change="Confirmed entries"
                    trend="neutral"
                    isLoading={isLoading} 
                />
            </div>

            <TableToolbar
                searchPlaceholder="Search events or organizers..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                {/* Filter chips aligned to event_status enum values */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                        { value: 'all', label: 'All' },
                        { value: 'draft', label: 'Draft' },
                        { value: 'published', label: 'Published' },
                        { value: 'active', label: 'Active' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'archived', label: 'Archived' },
                        { value: 'cancelled', label: 'Cancelled' },
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
                    events={paginatedEvents}
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
        </div>
    );
}
