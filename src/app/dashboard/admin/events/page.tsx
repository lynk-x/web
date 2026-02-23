"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';
import adminStyles from '../page.module.css';
import EventTable, { Event } from '@/components/organize/EventTable';

// Mock Data
const mockEvents: Event[] = [
    { id: 'mock-1', title: 'Summer Music Festival', organizer: 'Global Beats', date: '2025-07-15 · 14:00', location: 'Central Park, NY', status: 'active', attendees: 5200 },
    { id: 'mock-2', title: 'Tech Innovators Summit', organizer: 'TechDaily', date: '2025-08-10 · 09:00', location: 'Convention Center, SF', status: 'pending', attendees: 0 },
    { id: 'mock-3', title: 'Local Art Showcase', organizer: 'Community Arts', date: '2025-06-20 · 18:00', location: 'City Gallery', status: 'past', attendees: 150 },
    { id: 'mock-4', title: 'Charity Run 5K', organizer: 'RunForGood', date: '2025-09-05 · 07:00', location: 'Riverside Park', status: 'active', attendees: 850 },
    { id: 'mock-5', title: 'Unauthorized Rave', organizer: 'Anon Party', date: '2025-07-20 · 22:00', location: 'Abandoned Warehouse', status: 'rejected', attendees: 0 },
    { id: 'mock-6', title: 'Cooking Workshop', organizer: 'Chef Mario', date: '2025-07-01 · 10:00', location: 'Culinary School', status: 'active', attendees: 25 },
    { id: 'mock-7', title: 'Startup Pitch Night', organizer: 'Venture Hub', date: '2025-07-25 · 19:00', location: 'Innovation Lab', status: 'pending', attendees: 0 },
];

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import { exportToCSV } from '@/utils/export';

export default function AdminEventsPage() {
    const { showToast } = useToast();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic
    const filteredEvents = mockEvents.filter(event => {
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
    const handlePlatformAlert = () => {
        showToast('Drafting platform-wide event alert...', 'info');
    };

    const handleGlobalReadOnly = () => {
        showToast('Switching all platform events to read-only/closed state...', 'warning');
    };

    const handleAddAIModerator = () => {
        showToast('AI moderation layer activated for all events.', 'success');
    };

    const handleDownloadMasterCSV = () => {
        showToast('Exporting master event database...', 'info');
        exportToCSV(mockEvents, 'platform_events_master_report');
        showToast('Master Event CSV ready.', 'success');
    };

    const handleBulkApprove = () => {
        showToast(`Approving ${selectedEventIds.size} events...`, 'info');
        setTimeout(() => {
            showToast(`Successfully approved ${selectedEventIds.size} events.`, 'success');
            setSelectedEventIds(new Set());
        }, 1000);
    };

    const handleBulkReject = () => {
        showToast(`Rejecting ${selectedEventIds.size} events...`, 'info');
        setTimeout(() => {
            showToast(`Successfully rejected ${selectedEventIds.size} events.`, 'error');
            setSelectedEventIds(new Set());
        }, 1000);
    };

    const handleBulkForceSync = () => {
        showToast(`Force-syncing cache for ${selectedEventIds.size} events...`, 'info');
        setTimeout(() => {
            showToast('Cache synchronized.', 'success');
            setSelectedEventIds(new Set());
        }, 1200);
    };

    const handleViewAuditLogs = () => {
        showToast(`Opening combined audit logs for ${selectedEventIds.size} events...`, 'info');
        router.push('/dashboard/admin/audit-logs'); // Simplified, could pass IDs
    };

    const handleExportEventData = () => {
        const selectedEvents = mockEvents.filter(e => selectedEventIds.has(e.id));
        showToast(`Preparing data export for ${selectedEventIds.size} events...`, 'info');
        exportToCSV(selectedEvents, 'event_management_export');
        showToast('Export successful.', 'success');
        setSelectedEventIds(new Set());
    };

    const bulkActions: BulkAction[] = [
        { label: 'Approve', onClick: handleBulkApprove, variant: 'success' },
        { label: 'Reject', onClick: handleBulkReject },
        { label: 'Set Read Only', onClick: handleGlobalReadOnly },
        { label: 'Add AI Moderator', onClick: handleAddAIModerator },
        { label: 'View Logs', onClick: handleViewAuditLogs },
        { label: 'Export Selection', onClick: handleExportEventData }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={adminStyles.title}>Event Management</h1>
                    <p className={adminStyles.subtitle}>Review, approve, and moderate events across the platform.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className={adminStyles.btnSecondary} onClick={handlePlatformAlert}>
                        Platform Alert
                    </button>
                    <Link href="/dashboard/admin/events/create" className={adminStyles.btnPrimary}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Create Event
                    </Link>
                </div>
            </header>

            <TableToolbar
                searchPlaceholder="Search events or organizers..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            />

            <BulkActionsBar
                selectedCount={selectedEventIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedEventIds(new Set())}
                itemTypeLabel="events"
            />

            <EventTable
                events={paginatedEvents}
                selectedIds={selectedEventIds}
                onSelect={handleSelectEvent}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onEdit={(event) => router.push(`/dashboard/admin/events/${event.id}/edit`)}
            />
        </div>
    );
}
