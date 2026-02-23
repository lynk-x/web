"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import organizeStyles from '@/app/dashboard/organize/page.module.css';
import BackButton from '@/components/shared/BackButton';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import AttendeeTable from '@/components/organize/attendees/AttendeeTable';
import { useToast } from '@/components/ui/Toast';
import type { Attendee } from '@/types/organize';

// Mock Attendees Data
const mockAttendees: Attendee[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', ticketType: 'VIP Experience', purchaseDate: '2024-05-15', status: 'checked_in', orderId: 'ORD-7721' },
    { id: '2', name: 'Alice Smith', email: 'alice@business.com', ticketType: 'General Admission', purchaseDate: '2024-05-16', status: 'registered', orderId: 'ORD-7722' },
    { id: '3', name: 'Robert Brown', email: 'robert@gmail.com', ticketType: 'Early Bird', purchaseDate: '2024-05-14', status: 'registered', orderId: 'ORD-7723' },
    { id: '4', name: 'Sarah Wilson', email: 'sarah@design.co', ticketType: 'VIP Experience', purchaseDate: '2024-05-17', status: 'cancelled', orderId: 'ORD-7724' },
    { id: '5', name: 'Michael Chen', email: 'm.chen@tech.com', ticketType: 'General Admission', purchaseDate: '2024-05-18', status: 'checked_in', orderId: 'ORD-7725' },
    { id: '6', name: 'Emma Davis', email: 'emma.d@live.com', ticketType: 'Early Bird', purchaseDate: '2024-05-12', status: 'registered', orderId: 'ORD-7726' },
    { id: '7', name: 'David Miller', email: 'david@miller.net', ticketType: 'General Admission', purchaseDate: '2024-05-19', status: 'registered', orderId: 'ORD-7727' },
];

export default function EventAttendeesPage({ params }: { params: { id: string } }) {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic
    const filteredAttendees = mockAttendees.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.orderId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredAttendees.length / itemsPerPage);
    const paginatedAttendees = filteredAttendees.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set());
    }, [searchTerm, statusFilter]);

    const handleSelect = (id: string) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === paginatedAttendees.length) {
            setSelectedIds(new Set());
        } else {
            const next = new Set(selectedIds);
            paginatedAttendees.forEach(a => next.add(a.id));
            setSelectedIds(next);
        }
    };

    const bulkActions: BulkAction[] = [
        {
            label: 'Check-in Selected',
            onClick: () => {
                showToast(`Checking in ${selectedIds.size} attendees...`, 'info');
                setSelectedIds(new Set());
            }
        },
        {
            label: 'Export CSV',
            onClick: () => showToast('Generating export...', 'info')
        }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <BackButton label="Back to Event" />
                <div className={styles.headerTitle}>
                    <h1 className={organizeStyles.title}>Attendee List</h1>
                    <p className={organizeStyles.subtitle}>Manage registrations and check-ins for this event.</p>
                </div>
            </header>

            <TableToolbar
                searchPlaceholder="Search by name, email, or order ID..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <div className={styles.filters}>
                    {['all', 'registered', 'checked_in', 'cancelled'].map(status => (
                        <button
                            key={status}
                            className={`${styles.filterChip} ${statusFilter === status ? styles.activeChip : ''}`}
                            onClick={() => setStatusFilter(status)}
                        >
                            {status === 'all' ? 'All' : status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                        </button>
                    ))}
                </div>
            </TableToolbar>

            <BulkActionsBar
                selectedCount={selectedIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedIds(new Set())}
                itemTypeLabel="attendees"
            />

            <AttendeeTable
                attendees={paginatedAttendees}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
