"use client";

import React, { useState } from 'react';
import styles from './page.module.css'; // Using local styles for cleaner encapsulation
import EventTable, { Event } from '@/components/organize/EventTable'; // Moved to organize folder
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar from '@/components/shared/BulkActionsBar';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { ToastProvider, useToast } from '@/components/ui/Toast';

// Mock Data for Organizer Events
const mockEvents: Event[] = [
    { id: '1', title: 'Nairobi Tech Summit', organizer: 'You', date: 'Oct 12, 2025 • 9:00 AM', location: 'KICC, Nairobi', status: 'active', attendees: 1250, thumbnailUrl: '/images/event1.jpg' },
    { id: '2', title: 'Mombasa Music Fest', organizer: 'You', date: 'Nov 05, 2025 • 4:00 PM', location: 'Mama Ngina Waterfront', status: 'pending', attendees: 0, thumbnailUrl: '/images/event2.jpg' },
    { id: '3', title: 'Kisumu Art Expo', organizer: 'You', date: 'Dec 10, 2025 • 10:00 AM', location: 'Kisumu Museum', status: 'past', attendees: 450, thumbnailUrl: '/images/event3.jpg' },
    { id: '4', title: 'Nakuru Rugby Sevens', organizer: 'You', date: 'Jan 15, 2026 • 2:00 PM', location: 'ASK Showground', status: 'rejected', attendees: 0, thumbnailUrl: '/images/event4.jpg' },
    { id: '5', title: 'Eldoret Marathon', organizer: 'You', date: 'Feb 20, 2026 • 6:00 AM', location: 'Eldoret Town', status: 'active', attendees: 3000, thumbnailUrl: '/images/event5.jpg' },
];

// Main Component
export default function OrganizerEventsPage() {
    const { showToast } = useToast();

    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Filter States
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'past'>('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(2); // Reduced for pagination visibility
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Filter Logic
    const filteredEvents = mockEvents.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.location.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all'
            ? true
            : statusFilter === 'draft'
                ? event.status === 'pending' || event.status === 'rejected' // Mapping draft concepts to existing statuses
                : event.status === statusFilter;

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

    const confirmDelete = () => {
        // Here you would call your API to delete the events
        showToast(`Successfully deleted ${selectedIds.size} events.`, 'success');
        setSelectedIds(new Set());
        // In a real app, you'd reload data here
    };

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
                    { label: 'Guest List', onClick: () => showToast(`Generating guest list for ${selectedIds.size} events...`, 'info'), variant: 'default' },
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


