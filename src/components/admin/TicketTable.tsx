"use client";

import React from 'react';
import styles from './TicketTable.module.css';
import TableCheckbox from '../shared/TableCheckbox';
import Badge, { BadgeVariant } from '../shared/Badge';
import TableRowActions, { ActionItem } from '../shared/TableRowActions';
import Pagination from '../shared/Pagination';
import { useToast } from '@/components/ui/Toast';

export interface Ticket {
    id: string;
    subject: string;
    requester: string;
    priority: 'high' | 'medium' | 'low';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    assignedTo?: string;
    lastUpdated: string;
}

interface TicketTableProps {
    tickets: Ticket[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const TicketTable: React.FC<TicketTableProps> = ({
    tickets,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange
}) => {
    const { showToast } = useToast();
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

    const formatString = (str: string) => {
        return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const allSelected = tickets.length > 0 && selectedIds?.size === tickets.length;
    const isIndeterminate = (selectedIds?.size || 0) > 0 && !allSelected;

    const getTicketActions = (ticket: Ticket): ActionItem[] => {
        return [
            {
                label: 'View Details',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => showToast(`Opening ticket #${ticket.id}...`, 'info')
            },
            {
                label: 'Edit Status',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
                onClick: () => showToast(`Entering edit mode for ticket #${ticket.id}...`, 'info')
            }
        ];
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
                        <th>Ticket Details</th>
                        <th>Requester</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Assigned To</th>
                        <th>Updated</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {tickets.map((ticket) => (
                        <tr key={ticket.id} className={selectedIds?.has(ticket.id) ? styles.rowSelected : ''}>
                            <td>
                                <TableCheckbox
                                    checked={selectedIds?.has(ticket.id) || false}
                                    onChange={() => onSelect && onSelect(ticket.id)}
                                />
                            </td>
                            <td>
                                <div>
                                    <div className={styles.subject}>{ticket.subject}</div>
                                    <div className={styles.ticketId}>#{ticket.id}</div>
                                </div>
                            </td>
                            <td>
                                <div className={styles.userInfo}>
                                    <div className={styles.avatar} style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                        {getInitials(ticket.requester)}
                                    </div>
                                    <span className={styles.userName}>{ticket.requester}</span>
                                </div>
                            </td>
                            <td>
                                <Badge
                                    label={ticket.priority}
                                    variant={getPriorityVariant(ticket.priority)}
                                />
                            </td>
                            <td>
                                <Badge
                                    label={formatString(ticket.status)}
                                    variant={getStatusVariant(ticket.status)}
                                    showDot
                                />
                            </td>
                            <td>
                                <div style={{ fontSize: '13px', opacity: ticket.assignedTo ? 1 : 0.5 }}>
                                    {ticket.assignedTo || 'Unassigned'}
                                </div>
                            </td>
                            <td>
                                <div style={{ fontSize: '13px', opacity: 0.8 }}>{ticket.lastUpdated}</div>
                            </td>
                            <td>
                                <div className={styles.actions}>
                                    <TableRowActions actions={getTicketActions(ticket)} />
                                </div>
                            </td>
                        </tr>
                    ))}
                    {tickets.length === 0 && (
                        <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '32px', opacity: 0.5 }}>
                                No tickets found matching criteria.
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

export default TicketTable;
