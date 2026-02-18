"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import TicketTable, { Ticket } from '@/components/admin/TicketTable';

// Mock Data
const mockTickets: Ticket[] = [
    { id: '1024', subject: 'Unable to withdraw funds', requester: 'Alice Walker', priority: 'high', status: 'open', assignedTo: 'John Doe', lastUpdated: '1 hour ago' },
    { id: '1023', subject: 'Event banner not uploading', requester: 'EventPro Ltd', priority: 'medium', status: 'in_progress', assignedTo: 'Sarah Smith', lastUpdated: '3 hours ago' },
    { id: '1022', subject: 'Refund request for cancelled event', requester: 'Bob Jones', priority: 'low', status: 'resolved', assignedTo: 'John Doe', lastUpdated: '1 day ago' },
    { id: '1021', subject: 'Account verification pending', requester: 'New Organizer', priority: 'medium', status: 'open', lastUpdated: '2 hours ago' },
    { id: '1020', subject: 'Api rate limit inquiry', requester: 'Tech Partner', priority: 'low', status: 'closed', assignedTo: 'Dev Team', lastUpdated: '3 days ago' },
    { id: '1019', subject: 'Login issues on mobile', requester: 'Mobile User', priority: 'high', status: 'in_progress', assignedTo: 'Mobile Dev', lastUpdated: '5 hours ago' },
];

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';

export default function AdminSupportPage() {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic
    const filteredTickets = mockTickets.filter(ticket => {
        const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.requester.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
        const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
        return matchesSearch && matchesPriority && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
    const paginatedTickets = filteredTickets.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedTicketIds(new Set());
    }, [searchTerm, priorityFilter, statusFilter]);

    // Selection Logic
    const handleSelectTicket = (id: string) => {
        const newSelected = new Set(selectedTicketIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedTicketIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedTicketIds.size === paginatedTickets.length) {
            setSelectedTicketIds(new Set());
        } else {
            const newSelected = new Set(selectedTicketIds);
            paginatedTickets.forEach(t => newSelected.add(t.id));
            setSelectedTicketIds(newSelected);
        }
    };

    const handleBulkResolve = () => {
        showToast(`Resolving ${selectedTicketIds.size} tickets...`, 'info');
        setTimeout(() => {
            showToast('Tickets resolved successfully.', 'success');
            setSelectedTicketIds(new Set());
        }, 1000);
    };

    const handleBulkClose = () => {
        showToast(`Closing ${selectedTicketIds.size} tickets...`, 'info');
        setTimeout(() => {
            showToast('Tickets closed.', 'error');
            setSelectedTicketIds(new Set());
        }, 1000);
    };

    const handleBulkAssign = () => {
        showToast(`Assigning ${selectedTicketIds.size} tickets to you...`, 'info');
        setTimeout(() => {
            showToast('Tickets assigned to your queue.', 'success');
            setSelectedTicketIds(new Set());
        }, 1000);
    };

    const bulkActions: BulkAction[] = [
        { label: 'Resolve Selected', onClick: handleBulkResolve, variant: 'success' },
        { label: 'Close Selected', onClick: handleBulkClose, variant: 'danger' },
        { label: 'Assign to Me', onClick: handleBulkAssign }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={adminStyles.title}>Support Desk</h1>
                    <p className={adminStyles.subtitle}>Track, prioritize, and resolve user tickets.</p>
                </div>
                <button className={adminStyles.btnPrimary}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Create Ticket
                </button>
            </header>

            {/* Quick Stats */}
            <div className={adminStyles.statsGrid}>
                <div className={adminStyles.statCard}>
                    <div className={adminStyles.statLabel}>Open Tickets</div>
                    <div className={adminStyles.statValue} style={{ color: '#64b5f6' }}>24</div>
                </div>
                <div className={adminStyles.statCard}>
                    <div className={adminStyles.statLabel}>High Priority</div>
                    <div className={adminStyles.statValue} style={{ color: '#e57373' }}>3</div>
                </div>
                <div className={adminStyles.statCard}>
                    <div className={adminStyles.statLabel}>Avg Response Time</div>
                    <div className={adminStyles.statValue}>1.5h</div>
                </div>
                <div className={adminStyles.statCard}>
                    <div className={adminStyles.statLabel}>Resolved Today</div>
                    <div className={adminStyles.statValue} style={{ color: '#81c784' }}>12</div>
                </div>
            </div>

            <TableToolbar
                searchPlaceholder="Search tickets..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <div className={adminStyles.filterGroup}>
                    {['all', 'open', 'in_progress', 'resolved', 'closed'].map(status => (
                        <button
                            key={status}
                            className={`${adminStyles.chip} ${statusFilter === status ? adminStyles.chipActive : ''}`}
                            onClick={() => setStatusFilter(status)}
                        >
                            {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}

                    <select
                        className={adminStyles.filterSelect}
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                    >
                        <option value="all">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </TableToolbar>

            <BulkActionsBar
                selectedCount={selectedTicketIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedTicketIds(new Set())}
                itemTypeLabel="tickets"
            />

            <TicketTable
                tickets={paginatedTickets}
                selectedIds={selectedTicketIds}
                onSelect={handleSelectTicket}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
