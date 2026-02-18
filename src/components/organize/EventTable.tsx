"use client";

import React from 'react';
import styles from './EventTable.module.css';
import adminStyles from '../../app/dashboard/admin/page.module.css';
import TableCheckbox from '../shared/TableCheckbox';
import Badge, { BadgeVariant } from '../shared/Badge';
import TableRowActions, { ActionItem } from '../shared/TableRowActions';
import Pagination from '../shared/Pagination';
import { useToast } from '../ui/Toast';

export interface Event {
    id: string;
    title: string;
    organizer: string;
    date: string;
    location: string;
    status: 'active' | 'pending' | 'past' | 'rejected';
    attendees: number;
    thumbnailUrl?: string;
}

interface EventTableProps {
    events: Event[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const EventTable: React.FC<EventTableProps> = ({
    events,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange
}) => {
    const getStatusVariant = (status: string): BadgeVariant => {
        switch (status) {
            case 'active': return 'success';
            case 'pending': return 'warning';
            case 'past': return 'neutral';
            case 'rejected': return 'error';
            default: return 'neutral';
        }
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const allSelected = events.length > 0 && selectedIds?.size === events.length;
    const isIndeterminate = (selectedIds?.size || 0) > 0 && !allSelected;

    const { showToast } = useToast();

    const getEventActions = (event: Event): ActionItem[] => {
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
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{ width: '40px' }}>
                            <TableCheckbox
                                checked={allSelected}
                                onChange={() => onSelectAll && onSelectAll()}
                                indeterminate={isIndeterminate}
                                disabled={!onSelectAll}
                            />
                        </th>
                        <th>Event</th>
                        <th>Date & Time</th>
                        <th>Details</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {events.map((event) => (
                        <tr key={event.id} className={selectedIds?.has(event.id) ? styles.rowSelected : ''}>
                            <td>
                                <TableCheckbox
                                    checked={selectedIds?.has(event.id) || false}
                                    onChange={() => onSelect && onSelect(event.id)}
                                />
                            </td>
                            <td>
                                <div className={styles.eventInfo}>
                                    <div className={styles.thumbnail} style={event.thumbnailUrl ? { backgroundImage: `url(${event.thumbnailUrl})` } : {}}>
                                        {!event.thumbnailUrl && <div className={styles.thumbnailPlaceholder}>IMG</div>}
                                    </div>
                                    <div className={styles.eventDetails}>
                                        <span className={styles.eventTitle}>{event.title}</span>
                                        <span className={styles.eventOrganizer}>by {event.organizer}</span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div style={{ fontSize: '13px' }}>{event.date}</div>
                            </td>
                            <td>
                                <div style={{ fontSize: '13px', opacity: 0.8 }}>
                                    <div>{event.location}</div>
                                    <div style={{ fontSize: '11px', opacity: 0.6 }}>{event.attendees} attendees</div>
                                </div>
                            </td>
                            <td>
                                <Badge
                                    label={formatStatus(event.status)}
                                    variant={getStatusVariant(event.status)}
                                    showDot
                                />
                            </td>
                            <td>
                                <div className={styles.actions}>
                                    <TableRowActions actions={getEventActions(event)} />
                                </div>
                            </td>
                        </tr>
                    ))}
                    {events.length === 0 && (
                        <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '32px', opacity: 0.5 }}>
                                No events found matching criteria.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {onPageChange && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                />
            )}
        </div>
    );
};

export default EventTable;
