"use client";

import React from 'react';
import styles from './AdsInvoiceTable.module.css';
import Badge, { BadgeVariant } from '../shared/Badge';
import TableRowActions, { ActionItem } from '../shared/TableRowActions';
import Pagination from '../shared/Pagination';
import { useToast } from '@/components/ui/Toast';

export interface Invoice {
    id: string;
    date: string;
    amount: string;
    status: 'paid' | 'pending' | 'overdue';
}

interface AdsInvoiceTableProps {
    invoices: Invoice[];
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const AdsInvoiceTable: React.FC<AdsInvoiceTableProps> = ({
    invoices,
    currentPage = 1,
    totalPages = 1,
    onPageChange
}) => {
    const { showToast } = useToast();

    const getStatusVariant = (status: string): BadgeVariant => {
        switch (status) {
            case 'paid': return 'success';
            case 'pending': return 'warning';
            case 'overdue': return 'error';
            default: return 'neutral';
        }
    };

    const getInvoiceActions = (invoice: Invoice): ActionItem[] => [
        {
            label: 'Download PDF',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
            onClick: () => {
                showToast(`Preparing invoice ${invoice.id}...`, 'info');
                setTimeout(() => showToast('Invoice downloaded successfully.', 'success'), 1500);
            }
        },
        {
            label: 'View Details',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
            onClick: () => showToast(`Opening invoice ${invoice.id} details...`, 'info')
        }
    ];

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {invoices.map((invoice) => (
                        <tr key={invoice.id}>
                            <td>{invoice.date}</td>
                            <td>{invoice.amount}</td>
                            <td>
                                <Badge
                                    label={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                    variant={getStatusVariant(invoice.status)}
                                    showDot
                                />
                            </td>
                            <td>
                                <div className={styles.actions}>
                                    <TableRowActions actions={getInvoiceActions(invoice)} />
                                </div>
                            </td>
                        </tr>
                    ))}
                    {invoices.length === 0 && (
                        <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '24px', opacity: 0.5 }}>
                                No invoices found.
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

export default AdsInvoiceTable;
