"use client";

import React from 'react';
import styles from './EventsTable.module.css';
import DataTable, { Column } from '../shared/DataTable';
import Badge, { BadgeVariant } from '../shared/Badge';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { formatString } from '@/utils/format';
import type { ActionItem } from '../shared/TableRowActions';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { EventRow } from '@/types/organize';
import type { EventRow } from '@/types/organize';

interface EventsTableProps {
    events: EventRow[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'published': return 'success';
        case 'draft': return 'warning';
        case 'ended': return 'neutral';
        default: return 'neutral';
    }
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Organizer event management table.
 * Displays event names, ticket counts, revenue, status, and dates with editing actions.
 */
const EventsTable: React.FC<EventsTableProps> = ({
    events,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const { showToast } = useToast();
    const router = useRouter();

    /** Column definitions for the events table. */
    const columns: Column<EventRow>[] = [
        {
            header: 'Event Name',
            render: (event) => <div style={{ fontWeight: 500 }}>{event.name}</div>,
        },
        {
            header: 'Tickets',
            render: (event) => <div style={{ fontSize: '13px' }}>{event.tickets}</div>,
        },
        {
            header: 'Revenue',
            render: (event) => <div style={{ fontWeight: 500 }}>{event.revenue}</div>,
        },
        {
            header: 'Status',
            render: (event) => (
                <Badge label={formatString(event.status)} variant={getStatusVariant(event.status)} showDot />
            ),
        },
        {
            header: 'Date',
            render: (event) => (
                <div className={styles.datePill}>{event.date}</div>
            ),
        },
    ];

    /** Row-level actions for each event. */
    const getActions = (event: EventRow): ActionItem[] => [
        {
            label: 'Edit Event',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => showToast(`Editing event: ${event.name}...`, 'info'),
        },
        {
            label: 'View Analytics',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
            onClick: () => showToast(`Loading analytics for ${event.name}...`, 'info'),
        },
        {
            label: 'Attendee List',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
            onClick: () => router.push(`/dashboard/organize/events/${event.id}/attendees`),
        },
        {
            label: 'Delete',
            variant: 'danger',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            onClick: () => {
                showToast(`Deleting event: ${event.name}...`, 'info');
                setTimeout(() => showToast('Event deleted.', 'success'), 1500);
            },
        },
    ];

    return (
        <DataTable<EventRow>
            data={events}
            columns={columns}
            getActions={getActions}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="No events found matching criteria."
        />
    );
};

export default EventsTable;
