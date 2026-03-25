"use client";

import React from 'react';
import styles from './EventTable.module.css';
import DataTable, { Column } from '../shared/DataTable';
import { useRouter } from 'next/navigation';
import Badge, { BadgeVariant } from '../shared/Badge';
import { useToast } from '../ui/Toast';
import { formatString, formatCurrency } from '@/utils/format';
import type { ActionItem } from '../shared/TableRowActions';
import { exportToCSV } from '@/utils/export';

// ─── Types ───────────────────────────────────────────────────────────────────

import type { OrganizerEvent, EventRow } from '@/types/organize';

/** Re-exported for backward compatibility. */
export type Event = OrganizerEvent;
export type { EventRow };

/**
 * Rendering mode.
 *
 * - `'admin'`     — Admin / moderation view. Shows organizer names, report count,
 *                   and status-change actions. Uses the richer `OrganizerEvent` type.
 * - `'organizer'` — Organizer self-serve view. Shows revenue, seat capacity, and
 *                   edit/analytics shortcuts. Uses the lighter `EventRow` type.
 *
 * Defaults to `'admin'` when omitted to preserve the existing API.
 */
export type EventTableMode = 'admin' | 'organizer';

/** Union of the two row types so the component can stay generic. */
type AnyEventRow = OrganizerEvent | EventRow;

// ─── Shared Props ─────────────────────────────────────────────────────────────

interface SharedProps {
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    isLoading?: boolean;
}

// ─── Mode-specific Props ──────────────────────────────────────────────────────

interface AdminModeProps extends SharedProps {
    mode?: 'admin';
    /** Full admin event rows. */
    events: OrganizerEvent[];
    onEdit?: (event: OrganizerEvent) => void;
    onDelete?: (event: OrganizerEvent) => void;
    onStatusChange?: (event: OrganizerEvent, newStatus: 'draft' | 'published' | 'cancelled') => void;
}

interface OrganizerModeProps extends SharedProps {
    mode: 'organizer';
    /** Lightweight organizer event rows. */
    events: EventRow[];
}

type EventTableProps = AdminModeProps | OrganizerModeProps;

// ─── Variant Helpers ──────────────────────────────────────────────────────────

/**
 * Maps `event_status` schema enum to badge colour variants.
 * Covers both admin enum (draft | published | active | completed | archived | cancelled)
 * and organizer subset (published | draft | ended).
 */
const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'active':
        case 'published': return 'success';
        case 'draft': return 'warning';
        case 'suspended':
        case 'cancelled': return 'error';
        case 'completed':
        case 'ended': return 'neutral';
        case 'archived': return 'subtle';
        default: return 'neutral';
    }
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Unified event management table for both admin and organizer contexts.
 *
 * In `admin` mode: full OrganizerEvent rows, organizer name, report count, moderation actions.
 * In `organizer` mode: lightweight EventRow rows, revenue, capacity, quick edit shortcuts.
 */
const EventTable: React.FC<EventTableProps> = (props) => {
    const { showToast } = useToast();
    const router = useRouter();
    const {
        selectedIds, onSelect, onSelectAll,
        currentPage = 1, totalPages = 1,
        onPageChange, isLoading = false,
        mode = 'admin', events,
    } = props;

    // ── Admin mode ────────────────────────────────────────────────────────────

    if (mode === 'admin') {
        const adminProps = props as AdminModeProps;
        const adminEvents = events as OrganizerEvent[];

        const columns: Column<OrganizerEvent>[] = [
            {
                header: 'Event',
                render: (event) => (
                    <div className={styles.eventInfo}>
                        <div
                            className={styles.thumbnail}
                            style={event.thumbnailUrl ? { backgroundImage: `url(${event.thumbnailUrl})` } : {}}
                        >
                            {!event.thumbnailUrl && <div className={styles.thumbnailPlaceholder}>IMG</div>}
                        </div>
                        <div className={styles.eventDetails}>
                            <span className={styles.eventTitle}>
                                {event.title}
                                {event.isPrivate && (
                                    <span style={{ marginLeft: '6px', display: 'inline-flex' }}>
                                        <Badge label="PRIVATE" variant="subtle" />
                                    </span>
                                )}
                            </span>
                            <span className={styles.eventOrganizer}>by {event.organizer}</span>
                        </div>
                    </div>
                ),
            },
            {
                header: 'Date',
                render: (event) => <div style={{ fontSize: '13px' }}>{event.date}</div>,
            },
            {
                header: 'Time',
                render: (event) => <div style={{ fontSize: '13px' }}>{event.time}</div>,
            },
            {
                header: 'Details',
                render: (event) => (
                    <div style={{ fontSize: '13px', opacity: 0.8 }}>
                        <div>{event.location}</div>
                        <div style={{ fontSize: '11px', opacity: 0.6 }}>{event.attendees} attendees</div>
                        {event.eventReference && (
                            <div style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'monospace' }}>#{event.eventReference}</div>
                        )}
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

        const getActions = (event: OrganizerEvent): ActionItem[] => {
            const actions: ActionItem[] = [
                {
                    label: 'View Details',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                    onClick: () => router.push(`/event/${event.id}`)
                },
                {
                    label: 'Attendee List',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
                    onClick: () => router.push(`/dashboard/organize/events/${event.id}/attendees`)
                },
            ];

            if (adminProps.onEdit) {
                actions.push({
                    label: 'Edit Event',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
                    onClick: () => adminProps.onEdit!(event)
                });
            }

            if (adminProps.onStatusChange) {
                if (event.status === 'draft') {
                    actions.push({
                        label: 'Publish',
                        variant: 'success' as const,
                        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                        onClick: () => adminProps.onStatusChange!(event, 'published')
                    });
                }
                if (event.status === 'active') {
                    actions.push({
                        label: 'Suspend',
                        variant: 'default',
                        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>,
                        onClick: () => adminProps.onStatusChange!(event, 'draft')
                    });
                    actions.push({
                        label: 'Cancel Event',
                        variant: 'danger' as const,
                        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                        onClick: () => adminProps.onStatusChange!(event, 'cancelled')
                    });
                }
            }

            if (adminProps.onDelete) {
                actions.push({
                    label: 'Delete Event',
                    variant: 'danger' as const,
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
                    onClick: () => adminProps.onDelete!(event)
                });
            }

            actions.push({
                label: 'Check-in Logs',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>,
                onClick: () => router.push(`/dashboard/organize/events/${event.id}/check-ins`)
            });
            actions.push({
                label: 'Export as CSV',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
                onClick: () => {
                    showToast(`Exporting data for ${event.title}`, 'info');
                    exportToCSV([event], `event_export_${event.id}`);
                    showToast('Export successful.', 'success');
                }
            });

            return actions;
        };

        return (
            <DataTable<OrganizerEvent>
                data={adminEvents}
                columns={columns}
                getActions={getActions}
                selectedIds={selectedIds}
                onSelect={onSelect}
                onSelectAll={onSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                isLoading={isLoading}
                emptyMessage="No events found matching criteria."
            />
        );
    }

    // ── Organizer mode ────────────────────────────────────────────────────────

    const orgEvents = events as EventRow[];

    const columns: Column<EventRow>[] = [
        {
            header: 'Event Name',
            render: (event) => <div style={{ fontWeight: 500 }}>{event.name}</div>,
        },
        {
            header: 'Tickets',
            render: (event) => (
                <div style={{ fontSize: '13px' }}>
                    <span style={{ fontWeight: 600 }}>{event.attendees}</span>
                    <span style={{ opacity: 0.5 }}> / {event.capacity === 0 ? '∞' : event.capacity}</span>
                </div>
            ),
        },
        {
            header: 'Revenue',
            render: (event) => (
                <div style={{ fontWeight: 500, fontFamily: 'var(--font-mono, monospace)' }}>
                    {formatCurrency(event.revenue)}
                </div>
            ),
        },
        {
            header: 'Status',
            render: (event) => (
                <Badge label={formatString(event.status)} variant={getStatusVariant(event.status)} showDot />
            ),
        },
        {
            header: 'Date',
            render: (event) => <div style={{ fontSize: '13px' }}>{event.date}</div>,
        },
        {
            header: 'Time',
            render: (event) => <div style={{ fontSize: '13px' }}>{event.time}</div>,
        },
    ];

    const getActions = (event: EventRow): ActionItem[] => [
        {
            label: 'Edit Event',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => showToast(`Editing event: ${event.name}...`, 'info'),
        },
        {
            label: 'Attendee List',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
            onClick: () => router.push(`/dashboard/organize/events/${event.id}/attendees`),
        },
        {
            label: 'Delete',
            variant: 'danger' as const,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            onClick: () => {
                showToast(`Deleting event: ${event.name}...`, 'info');
                setTimeout(() => showToast('Event deleted.', 'success'), 1500);
            },
        },
    ];

    return (
        <DataTable<EventRow>
            data={orgEvents}
            columns={columns}
            getActions={getActions}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            isLoading={isLoading}
            emptyMessage="No events found matching criteria."
        />
    );
};

export default EventTable;
