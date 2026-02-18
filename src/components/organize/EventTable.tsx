"use client";

import React from 'react';
import styles from './EventTable.module.css';
import DataTable, { Column } from '../shared/DataTable';
import Badge, { BadgeVariant } from '../shared/Badge';
import { useToast } from '../ui/Toast';
import { formatString } from '@/utils/format';
import type { ActionItem } from '../shared/TableRowActions';

// ─── Types ───────────────────────────────────────────────────────────────────

import type { OrganizerEvent } from '@/types/organize';
/** Re-exported as `Event` for backward compatibility. */
export type Event = OrganizerEvent;

interface EventTableProps {
    events: Event[];
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
        case 'active': return 'success';
        case 'pending': return 'warning';
        case 'past': return 'neutral';
        case 'rejected': return 'error';
        default: return 'neutral';
    }
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Admin event management table.
 * Displays events with thumbnails, dates, location details, and moderation actions.
 */
const EventTable: React.FC<EventTableProps> = ({
    events,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const { showToast } = useToast();

    /** Column definitions for the event moderation table. */
    const columns: Column<Event>[] = [
        {
            header: 'Event',
            render: (event) => (
                <div className={styles.eventInfo}>
                    <div className={styles.thumbnail} style={event.thumbnailUrl ? { backgroundImage: `url(${event.thumbnailUrl})` } : {}}>
                        {!event.thumbnailUrl && <div className={styles.thumbnailPlaceholder}>IMG</div>}
                    </div>
                    <div className={styles.eventDetails}>
                        <span className={styles.eventTitle}>{event.title}</span>
                        <span className={styles.eventOrganizer}>by {event.organizer}</span>
                    </div>
                </div>
            ),
        },
        {
            header: 'Date & Time',
            render: (event) => <div style={{ fontSize: '13px' }}>{event.date}</div>,
        },
        {
            header: 'Details',
            render: (event) => (
                <div style={{ fontSize: '13px', opacity: 0.8 }}>
                    <div>{event.location}</div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>{event.attendees} attendees</div>
                </div>
            ),
        },
        {
            header: 'Status',
            render: (event) => (
                <Badge label={formatString(event.status)} variant={getStatusVariant(event.status)} showDot />
            ),
        },
    ];

    /** Row-level actions for each event. */
    const getActions = (event: Event): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'View Details',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => showToast(`Viewing details for ${event.title}`, 'info')
            },
            {
                label: 'Edit Event',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
                onClick: () => showToast(`Redirecting to edit ${event.title}...`, 'info')
            }
        ];

        if (event.status === 'pending') {
            actions.push({
                label: 'Approve',
                variant: 'success',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                onClick: () => showToast(`Event "${event.title}" approved!`, 'success')
            });
            actions.push({
                label: 'Reject',
                variant: 'danger',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                onClick: () => showToast(`Event "${event.title}" rejected.`, 'error')
            });
        }

        if (event.status === 'active') {
            actions.push({
                label: 'Suspend',
                variant: 'danger',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>,
                onClick: () => showToast(`Event "${event.title}" has been suspended.`, 'warning')
            });
        }

        actions.push({
            label: 'Delete Event',
            variant: 'danger',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
            onClick: () => showToast(`Initiating deletion for ${event.title}...`, 'error')
        });

        return actions;
    };

    return (
        <DataTable<Event>
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

export default EventTable;
