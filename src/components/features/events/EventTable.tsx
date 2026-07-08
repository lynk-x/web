"use client";

import React from 'react';
import styles from './EventTable.module.css';
import DataTable, { Column } from '@/components/shared/DataTable';
import { useRouter } from 'next/navigation';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString, formatCurrency } from '@/utils/format';
import type { ActionItem } from '@/components/shared/TableRowActions';
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
/** Unified interface to prevent typescript lookup errors on union fields */
export interface AnyEventRow {
    id: string;
    title?: string;
    name?: string;
    eventReference?: string;
    reference?: string;
    date: string;
    endDate?: string;
    time: string;
    endTime?: string;
    timezone?: string;
    location?: string;
    status: string;
    attendees: number;
    capacity?: number;
    revenue?: number;
    currency?: string;
    forum_id?: string;
    forumReference?: string;
    createdAt: string;
    organizer?: string;
    reportsCount?: number;
    isDeleted?: boolean;
    thumbnailUrl?: string;
    isPrivate?: boolean;
}

// ─── Shared Props ─────────────────────────────────────────────────────────────

interface SharedProps {
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    isLoading?: boolean;
    className?: string;
}

// ─── Mode-specific Props ──────────────────────────────────────────────────────

interface AdminModeProps<T> extends SharedProps {
    mode?: 'admin';
    /** Full admin event rows. */
    events: T[];
    onEdit?: (event: T) => void;
    onDelete?: (event: T) => void;
    onDuplicate?: (event: T) => void;
    onStatusChange?: (event: T, newStatus: 'draft' | 'published' | 'active' | 'suspended' | 'rejected' | 'cancelled') => void;
    onRestore?: (event: T) => void;
}

interface OrganizerModeProps<T> extends SharedProps {
    mode: 'organizer';
    events: T[];
    onDuplicate?: (event: T) => void;
    onEdit?: (event: T) => void;
    onDelete?: (event: T) => void;
    onStatusChange?: (event: T, newStatus: string) => void;
}

type EventTableProps<T extends AnyEventRow = AnyEventRow> = AdminModeProps<T> | OrganizerModeProps<T>;

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
        default: return 'neutral';
    }
};

/**
 * Resolves the environment-aware URL for a forum.
 */
const getForumUrl = (reference: string): string => {
    const customPwaUrl = process.env.NEXT_PUBLIC_PWA_URL;
    if (customPwaUrl) {
        const base = customPwaUrl.replace(/\/$/, '');
        if (base.endsWith('/forum') || base.includes('/forum/')) {
            return `${base}/${reference}`;
        }
        return `${base}/forum/${reference}`;
    }

    if (typeof window !== 'undefined') {
        const host = window.location.host;

        if (host.includes('localhost') || host.includes('127.0.0.1')) {
            return `http://localhost:8080/forum/${reference}`;
        }

        if (host === 'lynk-x.app' || host === 'www.lynk-x.app') {
            return `https://app.lynk-x.app/forum/${reference}`;
        }
    }

    return `https://app.lynk-x.app/forum/${reference}`;
};

// ─── Component ───────────────────────────────────────────────────────────────

/** Helper function to format timezone IANA code into short abbreviation (e.g. "Africa/Nairobi" -> "EAT") */
const formatTimezone = (tz?: string): string => {
    if (!tz) return '';
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'short',
        }).formatToParts(new Date());
        const tzPart = parts.find(p => p.type === 'timeZoneName');
        return tzPart ? tzPart.value : tz;
    } catch {
        return tz;
    }
};

const renderSchedule = (event: AnyEventRow) => {
    const isMultiDay = event.endDate && event.endDate !== event.date;
    const tzAbbr = formatTimezone(event.timezone);
    const tzDisplay = tzAbbr ? ` ${tzAbbr}` : '';

    return (
        <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
            <div style={{ fontWeight: 500, color: 'var(--color-utility-primaryText)' }}>
                {event.date}
                {isMultiDay && ` — ${event.endDate}`}
            </div>
            <div style={{ opacity: 0.8, fontSize: '12px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>
                    {event.time}
                    {event.endTime && ` — ${event.endTime}`}
                </span>
                {tzDisplay && (
                    <span style={{ 
                        fontSize: '10px', 
                        fontWeight: 600, 
                        color: 'var(--color-brand-primary)', 
                        background: 'rgba(var(--color-brand-primary-rgb, 124, 58, 237), 0.1)', 
                        padding: '1px 5px', 
                        borderRadius: '4px',
                        letterSpacing: '0.5px'
                    }}>
                        {tzAbbr}
                    </span>
                )}
            </div>
        </div>
    );
};

/**
 * Unified event management table for both admin and organizer contexts.
 *
 * In `admin` mode: full OrganizerEvent rows, organizer name, report count, moderation actions.
 * In `organizer` mode: lightweight EventRow rows, revenue, capacity, quick edit shortcuts.
 */
export default function EventTable<T extends AnyEventRow = AnyEventRow>(props: EventTableProps<T>) {
    const { showToast } = useToast();
    const router = useRouter();
    const {
        selectedIds, onSelect, onSelectAll,
        currentPage = 1, totalPages = 1,
        onPageChange, isLoading = false,
        mode = 'admin', events, className = '',
    } = props;

    const onDuplicate = (props as any).onDuplicate;

    // ── Admin mode ────────────────────────────────────────────────────────────

    if (mode === 'admin') {
        const adminProps = props as AdminModeProps<T>;
        const adminEvents = events as T[];

        const columns: Column<T>[] = [
            {
                header: 'Reference',
                render: (event) => (
                    <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', opacity: 0.8, fontFamily: 'var(--font-mono, monospace)' }}>
                        {event.eventReference || 'N/A'}
                    </span>
                ),
            },
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
                header: 'Date & Time',
                render: (event) => renderSchedule(event),
            },
            {
                header: 'Location',
                render: (event) => (
                    <span style={{ fontSize: '13px', opacity: 0.85 }}>
                        {event.location || 'TBD'}
                    </span>
                ),
            },
            {
                header: 'Capacity',
                render: (event) => {
                    const cap = event.capacity ?? 0;
                    return (
                        <div style={{ fontSize: '13px' }}>
                            <span style={{ fontWeight: 600 }}>{event.attendees}</span>
                            <span style={{ opacity: 0.5 }}> / {cap === 0 ? '∞' : cap}</span>
                        </div>
                    );
                },
            },
            {
                header: 'Status',
                render: (event) => (
                    <Badge label={formatString(event.status)} variant={getStatusVariant(event.status)} showDot />
                ),
            },
        ];

        const getAdminActions = (event: T): ActionItem[] => {
            const actions: ActionItem[] = [];

            actions.push({
                label: 'View Event',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => router.push(`/event/${event.eventReference || event.id}`)
            });

            if (adminProps.onEdit) {
                actions.push({
                    label: 'Edit Event',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
                    onClick: () => adminProps.onEdit!(event)
                });
            }



            actions.push({
                label: 'Attendee List',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
                onClick: () => router.push(`/dashboard/organize/events/${event.id}/attendees`)
            });

            actions.push({
                label: 'Check-in Logs',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path></svg>,
                onClick: () => router.push(`/dashboard/organize/events/${event.id}/check-ins`)
            });


            if (event.forum_id) {
                actions.push({
                    label: 'Go to Forum',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>,
                    onClick: () => window.open(getForumUrl(event.forumReference || event.forum_id || event.eventReference || event.id), '_blank')
                });
            }

            if (adminProps.onStatusChange) {
                if (event.status === 'draft' || (event as any).status === 'pending_approval') {
                    actions.push({ divider: true } as ActionItem);
                    actions.push({
                        label: 'Publish Event',
                        variant: 'success' as const,
                        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                        onClick: () => adminProps.onStatusChange!(event, 'published')
                    });
                }
                if (event.status === 'active' || event.status === 'published') {
                    actions.push({
                        label: 'Cancel Event',
                        variant: 'danger' as const,
                        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                        onClick: () => adminProps.onStatusChange!(event, 'cancelled')
                    });
                }
            }

            if (event.isDeleted && adminProps.onRestore) {
                actions.push({ divider: true } as ActionItem);
                actions.push({
                    label: 'Restore',
                    variant: 'success' as const,
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>,
                    onClick: () => adminProps.onRestore!(event)
                });
            } else if (adminProps.onDelete) {
                actions.push({
                    label: 'Delete',
                    variant: 'danger' as const,
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
                    onClick: () => adminProps.onDelete!(event)
                });
            }

            return actions;
        };

        return (
            <DataTable<T>
                data={adminEvents}
                columns={columns}
                getActions={getAdminActions}
                selectedIds={selectedIds}
                onSelect={onSelect}
                onSelectAll={onSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                isLoading={isLoading}
                className={className}
                emptyMessage="No events found matching criteria."
            />
        );
    }

    // ── Organizer Mode ────────────────────────────────────────────────────────

    const orgEvents = events as T[];

    const columns: Column<T>[] = [
        {
            header: 'Reference',
            render: (event) => (
                <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', opacity: 0.8, fontFamily: 'var(--font-mono, monospace)' }}>
                    {event.eventReference || (event as EventRow).reference || 'N/A'}
                </span>
            ),
        },
        {
            header: 'Event Name',
            render: (event) => (
                <div className={styles.eventInfo}>
                    <div
                        className={styles.thumbnail}
                        style={event.thumbnailUrl ? { backgroundImage: `url(${event.thumbnailUrl})` } : {}}
                    >
                        {!event.thumbnailUrl && <div className={styles.thumbnailPlaceholder}>IMG</div>}
                    </div>
                    <div className={styles.eventDetails}>
                        <span className={styles.eventTitle}>{event.title || (event as EventRow).name}</span>
                    </div>
                </div>
            ),
        },
        {
            header: 'Date & Time',
            render: (event) => renderSchedule(event),
        },
        {
            header: 'Location',
            render: (event) => (
                <span style={{ fontSize: '13px', opacity: 0.85 }}>
                    {event.location || 'TBD'}
                </span>
            ),
        },
        {
            header: 'Capacity',
            render: (event) => {
                const cap = event.capacity ?? 0;
                return (
                    <div style={{ fontSize: '13px' }}>
                        <span style={{ fontWeight: 600 }}>{event.attendees}</span>
                        <span style={{ opacity: 0.5 }}> / {cap === 0 ? '∞' : cap}</span>
                    </div>
                );
            },
        },
        {
            header: 'Status',
            render: (event) => (
                <Badge label={formatString(event.status)} variant={getStatusVariant(event.status)} showDot />
            ),
        },
    ];

    const getOrganizerActions = (event: T): ActionItem[] => {
        const orgProps = props as OrganizerModeProps<T>;
        const actions: ActionItem[] = [];

        actions.push({
            label: 'View Event',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
            onClick: () => router.push(`/event/${event.eventReference || (event as EventRow).reference || event.id}`),
        });

        if (event.forum_id) {
            actions.push({
                label: 'Visit Forum',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>,
                onClick: () => window.open(getForumUrl(event.forumReference || event.forum_id || event.eventReference || (event as EventRow).reference || event.id), '_blank')
            });
        }

        if (orgProps.onEdit) {
            actions.push({
                label: 'Edit Event',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
                onClick: () => orgProps.onEdit!(event),
            });
        }

        actions.push({
            label: 'Attendee List',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
            onClick: () => router.push(`/dashboard/organize/events/${event.id}/attendees`),
        });

        actions.push({
            label: 'Check-in Logs',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path></svg>,
            onClick: () => router.push(`/dashboard/organize/events/${event.id}/check-ins`)
        });

        if (orgProps.onDelete) {
            actions.push({
                label: 'Delete',
                variant: 'danger' as const,
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
                onClick: () => orgProps.onDelete!(event),
            });
        }

        return actions;
    };

    return (
        <DataTable<T>
            data={orgEvents}
            columns={columns}
            getActions={getOrganizerActions}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            isLoading={isLoading}
            className={className}
            emptyMessage="No events found matching criteria."
        />
    );
}
