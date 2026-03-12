/**
 * EventsTable — backward-compatibility re-export.
 *
 * This component has been merged into EventTable under `mode="organizer"`.
 * Existing imports continue to work; new code should prefer:
 *
 *   import EventTable from '@/components/organize/EventTable';
 *   <EventTable mode="organizer" events={rows} />
 */
"use client";

import React from 'react';
import EventTable from './EventTable';
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

const EventsTable: React.FC<EventsTableProps> = (props) => (
    <EventTable mode="organizer" {...props} />
);

export default EventsTable;
export type { EventRow };
