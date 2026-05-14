"use client";

import React from 'react';
import DataTable, { Column } from '../../shared/DataTable';
import Badge from '../../shared/Badge';
import { formatCurrency, formatDate } from '@/utils/format';
import type { TicketResale } from '@/types/organize';

interface TicketResaleTableProps {
    resales: TicketResale[];
    isLoading?: boolean;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onViewTicket?: (resale: TicketResale) => void;
    onFlagListing?: (resale: TicketResale) => void;
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
}

const TicketResaleTable: React.FC<TicketResaleTableProps> = ({
    resales,
    isLoading = false,
    currentPage,
    totalPages,
    onPageChange,
    onViewTicket,
    onFlagListing,
    selectedIds,
    onSelect,
    onSelectAll,
}) => {
    
    const getStatusVariant = (status: TicketResale['status']) => {
        switch (status) {
            case 'active': return 'success';
            case 'sold': return 'info';
            case 'pending': return 'warning';
            case 'expired': return 'subtle';
            case 'cancelled': return 'neutral';
            default: return 'neutral';
        }
    };

    const columns: Column<TicketResale>[] = [
        {
            header: 'Reference',
            render: (r) => (
                <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '13px' }}>
                    {r.reference}
                </span>
            )
        },
        {
            header: 'Event_ref',
            render: (r) => (
                <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>
                    {r.event_reference}
                </span>
            )
        },
        {
            header: 'Seller_ref',
            render: (r) => (
                <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>
                    {r.seller_reference}
                </span>
            )
        },
        {
            header: 'Ticket_ref',
            render: (r) => (
                <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>
                    {r.ticket_reference}
                </span>
            )
        },
        {
            header: 'Currency',
            render: (r) => (
                <span style={{ fontWeight: 600, opacity: 0.8 }}>
                    {r.currency}
                </span>
            )
        },
        {
            header: 'Asking Price',
            render: (r) => (
                <span style={{ fontWeight: 700 }}>
                    {formatCurrency(r.asking_price, r.currency)}
                </span>
            )
        },
        {
            header: 'Listed_at',
            render: (r) => (
                <span style={{ fontSize: '13px', opacity: 0.6 }}>
                    {formatDate(r.listed_at)}
                </span>
            )
        },
        {
            header: 'Status',
            render: (r) => (
                <Badge label={r.status} variant={getStatusVariant(r.status)} showDot />
            )
        }
    ];

    const getActions = (resale: TicketResale) => [
        {
            label: 'View Ticket',
            onClick: () => onViewTicket?.(resale),
        },
        {
            label: 'Flag Listing',
            variant: 'danger' as const,
            onClick: () => onFlagListing?.(resale),
        }
    ];

    return (
        <DataTable
            data={resales}
            columns={columns}
            getActions={getActions}
            isLoading={isLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            emptyMessage="No ticket resales found."
        />
    );
};

export default TicketResaleTable;
