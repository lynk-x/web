"use client";

import React from 'react';
import Link from 'next/link';
import styles from './PerformanceTable.module.css';
import Badge, { BadgeVariant } from '../shared/Badge';
import Pagination from '../shared/Pagination';

export interface PerformanceEvent {
    id: number | string;
    event: string;
    sold: number;
    revenue: number;
    conversion: string;
    status: string;
}

interface PerformanceTableProps {
    data: PerformanceEvent[];
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const PerformanceTable: React.FC<PerformanceTableProps> = ({
    data,
    currentPage = 1,
    totalPages = 1,
    onPageChange
}) => {
    const getStatusVariant = (status: string): BadgeVariant => {
        switch (status.toLowerCase()) {
            case 'active': return 'success';
            case 'past': return 'neutral';
            case 'draft': return 'warning';
            default: return 'neutral';
        }
    };

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Event Name</th>
                        <th>Tickets Sold</th>
                        <th>Revenue</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item) => (
                        <tr key={item.id}>
                            <td className={styles.eventName}>{item.event}</td>
                            <td>{item.sold}</td>
                            <td className={styles.money}>KES {item.revenue.toLocaleString()}</td>
                            <td>
                                <Badge
                                    label={item.status}
                                    variant={getStatusVariant(item.status)}
                                />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                                <div className={styles.actions}>
                                    <Link href={`/dashboard/analytics/event/${item.id}`} className={styles.viewLink} title="View Insights">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="20" x2="18" y2="10"></line>
                                            <line x1="12" y1="20" x2="12" y2="4"></line>
                                            <line x1="6" y1="20" x2="6" y2="14"></line>
                                        </svg>
                                    </Link>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '32px', opacity: 0.5 }}>
                                No data available.
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

export default PerformanceTable;
