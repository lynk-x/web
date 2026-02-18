"use client";

import React from 'react';
import styles from './TicketTable.module.css';
import DataTable, { Column } from '../shared/DataTable';
import Badge, { BadgeVariant } from '../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString, getInitials } from '@/utils/format';
import type { ActionItem } from '../shared/TableRowActions';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { Ticket } from '@/types/admin';
import type { Ticket } from '@/types/admin';

interface TicketTableProps {
    tickets: Ticket[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

const getPriorityVariant = (priority: string): BadgeVariant => {
    switch (priority) {
        case 'high': return 'error';
        case 'medium': return 'warning';
        case 'low': return 'neutral';
        default: return 'neutral';
    }
};

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'open': return 'success';
        case 'in_progress': return 'warning';
        case 'resolved': return 'info';
        case 'closed': return 'neutral';
        default: return 'neutral';
    }
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Admin support ticket table.
 * Displays tickets with priority, status, assignment, and management actions.
 */
const TicketTable: React.FC<TicketTableProps> = ({
    tickets,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const { showToast } = useToast();

    /** Column definitions for the ticket table. */
    const columns: Column<Ticket>[] = [
        {
            header: 'Ticket Details',
            render: (ticket) => (
                <div>
                    <div className={styles.subject}>{ticket.subject}</div>
                    <div className={styles.ticketId}>#{ticket.id}</div>
                </div>
            ),
        },
        {
            header: 'Requester',
            render: (ticket) => (
                <div className={styles.userInfo}>
                    <div className={styles.avatar} style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                        {getInitials(ticket.requester)}
                    </div>
                    <span className={styles.userName}>{ticket.requester}</span>
                </div>
            ),
        },
        {
            header: 'Priority',
            render: (ticket) => <Badge label={ticket.priority} variant={getPriorityVariant(ticket.priority)} />,
        },
        {
            header: 'Status',
            render: (ticket) => (
                <Badge label={formatString(ticket.status)} variant={getStatusVariant(ticket.status)} showDot />
            ),
        },
        {
            header: 'Assigned To',
            render: (ticket) => (
                <div style={{ fontSize: '13px', opacity: ticket.assignedTo ? 1 : 0.5 }}>
                    {ticket.assignedTo || 'Unassigned'}
                </div>
            ),
        },
        {
            header: 'Updated',
            render: (ticket) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{ticket.lastUpdated}</div>,
        },
    ];

    /** Row-level actions for each ticket. */
    const getActions = (ticket: Ticket): ActionItem[] => [
        {
            label: 'View Details',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
            onClick: () => showToast(`Opening ticket #${ticket.id}...`, 'info'),
        },
        {
            label: 'Edit Status',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => showToast(`Entering edit mode for ticket #${ticket.id}...`, 'info'),
        },
    ];

    return (
        <DataTable<Ticket>
            data={tickets}
            columns={columns}
            getActions={getActions}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="No tickets found matching criteria."
        />
    );
};

export default TicketTable;
