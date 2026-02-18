"use client";

import React from 'react';
import styles from './EventsTable.module.css';
import TableCheckbox from '../shared/TableCheckbox';
import Badge, { BadgeVariant } from '../shared/Badge';
import TableRowActions, { ActionItem } from '../shared/TableRowActions';
import Pagination from '../shared/Pagination';

export interface DashboardEvent {
    id: string;
    name: string;
    location: string;
    time: string;
    month: string;
    day: string;
    status: 'published' | 'draft' | 'past';
}

interface EventsTableProps {
    events: DashboardEvent[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const EventsTable: React.FC<EventsTableProps> = ({
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
            case 'published': return 'success';
            case 'draft': return 'warning';
            case 'past': return 'neutral';
            default: return 'neutral';
        }
    };

    const formatString = (str: string) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const allSelected = events.length > 0 && selectedIds?.size === events.length;
    const isIndeterminate = (selectedIds?.size || 0) > 0 && !allSelected;

    const getEventActions = (event: DashboardEvent): ActionItem[] => [
        {
            label: 'Edit Event',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => console.log('Edit', event.id)
        },
        {
            label: 'View Analytics',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
            onClick: () => console.log('Analytics', event.id)
        },
        {
            label: 'Duplicate',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
            onClick: () => console.log('Duplicate', event.id)
        },
        { divider: true },
        {
            label: 'Delete',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
            variant: 'danger',
            onClick: () => console.log('Delete', event.id)
        }
    ];

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
                                <div className={styles.eventContent}>
                                    <div className={styles.eventDate}>
                                        <span className={styles.month}>{event.month}</span>
                                        <span className={styles.day}>{event.day}</span>
                                    </div>
                                    <div className={styles.eventInfo}>
                                        <div className={styles.eventName}>{event.name}</div>
                                        <div className={styles.eventMeta}>{event.location} • {event.time}</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <Badge
                                    label={formatString(event.status)}
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
                            <td colSpan={4} style={{ textAlign: 'center', padding: '32px', opacity: 0.5 }}>
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

export default EventsTable;
