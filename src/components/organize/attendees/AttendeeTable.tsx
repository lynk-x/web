"use client";

import React from 'react';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString } from '@/utils/format';
import type { ActionItem } from '../../shared/TableRowActions';
import type { Attendee } from '@/types/organize';

interface AttendeeTableProps {
    attendees: Attendee[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'checked_in': return 'success';
        case 'registered': return 'info';
        case 'cancelled': return 'error';
        default: return 'neutral';
    }
};

const AttendeeTable: React.FC<AttendeeTableProps> = ({
    attendees,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const { showToast } = useToast();

    const columns: Column<Attendee>[] = [
        {
            header: 'Attendee',
            render: (attendee) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{attendee.name}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{attendee.email}</div>
                </div>
            ),
        },
        {
            header: 'Ticket Type',
            render: (attendee) => <span>{attendee.ticketType}</span>,
        },
        {
            header: 'Order ID',
            render: (attendee) => <code style={{ fontSize: '12px', opacity: 0.8 }}>{attendee.orderId}</code>,
        },
        {
            header: 'Purchased On',
            render: (attendee) => <span style={{ fontSize: '13px' }}>{attendee.purchaseDate}</span>,
        },
        {
            header: 'Status',
            render: (attendee) => (
                <Badge
                    label={attendee.status === 'checked_in' ? 'Checked In' : formatString(attendee.status)}
                    variant={getStatusVariant(attendee.status)}
                    showDot
                />
            ),
        },
    ];

    const getActions = (attendee: Attendee): ActionItem[] => [
        {
            label: attendee.status === 'checked_in' ? 'Unmark Check-in' : 'Check In',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
            onClick: () => {
                const action = attendee.status === 'checked_in' ? 'Unmarked' : 'Checked in';
                showToast(`${action} ${attendee.name}`, 'success');
            },
        },
        {
            label: 'Contact Attendee',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>,
            onClick: () => showToast(`Opening email composer for ${attendee.name}...`, 'info'),
        },
        {
            label: 'Cancel Ticket',
            variant: 'danger',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>,
            onClick: () => showToast(`Initiating cancellation for ${attendee.name}...`, 'info'),
        },
    ];

    return (
        <DataTable<Attendee>
            data={attendees}
            columns={columns}
            getActions={getActions}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="No attendees found for this event."
        />
    );
};

export default AttendeeTable;
