"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import EventTable, { Event } from '@/components/organize/EventTable';

// Mock Data
const mockEvents: Event[] = [
    { id: '1', title: 'Summer Music Festival', organizer: 'Global Beats', date: '2025-07-15 · 14:00', location: 'Central Park, NY', status: 'active', attendees: 5200 },
    { id: '2', title: 'Tech Innovators Summit', organizer: 'TechDaily', date: '2025-08-10 · 09:00', location: 'Convention Center, SF', status: 'pending', attendees: 0 },
    { id: '3', title: 'Local Art Showcase', organizer: 'Community Arts', date: '2025-06-20 · 18:00', location: 'City Gallery', status: 'past', attendees: 150 },
    { id: '4', title: 'Charity Run 5K', organizer: 'RunForGood', date: '2025-09-05 · 07:00', location: 'Riverside Park', status: 'active', attendees: 850 },
    { id: '5', title: 'Unauthorized Rave', organizer: 'Anon Party', date: '2025-07-20 · 22:00', location: 'Abandoned Warehouse', status: 'rejected', attendees: 0 },
    { id: '6', title: 'Cooking Workshop', organizer: 'Chef Mario', date: '2025-07-01 · 10:00', location: 'Culinary School', status: 'active', attendees: 25 },
    { id: '7', title: 'Startup Pitch Night', organizer: 'Venture Hub', date: '2025-07-25 · 19:00', location: 'Innovation Lab', status: 'pending', attendees: 0 },
];

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';

export default function AdminEventsPage() {
    const { showToast } = useToast();
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

    const handleBulkDelete = () => {
        showToast(`Deleting ${selectedEventIds.size} events...`, 'info');
        setTimeout(() => {
            showToast(`Successfully deleted ${selectedEventIds.size} events.`, 'success');
            setSelectedEventIds(new Set());
        }, 1000);
    };

    const bulkActions: BulkAction[] = [
        { label: 'Approve Selected', onClick: handleBulkApprove, variant: 'success' },
        { label: 'Reject Selected', onClick: handleBulkReject },
        { label: 'Delete Selected', onClick: handleBulkDelete, variant: 'danger' }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={adminStyles.title}>Event Management</h1>
                    <p className={adminStyles.subtitle}>Review, approve, and moderate events across the platform.</p>
                </div>
                <button className={adminStyles.btnPrimary}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Create Event
                </button>
            </header>

            <TableToolbar
                searchPlaceholder="Search events or organizers..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <div className={adminStyles.filterGroup}>
                    {['all', 'active', 'pending', 'past', 'rejected'].map((status) => (
                        <button
                            key={status}
                            className={`${adminStyles.chip} ${statusFilter === status ? adminStyles.chipActive : ''}`}
                            onClick={() => setStatusFilter(status)}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
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

            <EventTable
                events={paginatedEvents}
                selectedIds={selectedEventIds}
                onSelect={handleSelectEvent}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
