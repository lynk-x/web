"use client";

import React, { useState } from 'react';
import styles from './AuditTable.module.css';
import Pagination from '../shared/Pagination';

export interface AuditLog {
    id: string;
    action: string;
    actor: {
        name: string;
        email: string;
        avatar?: string;
    };
    target: string;
    targetType: string;
    timestamp: string;
    ipAddress: string;
    userAgent: string;
    changes?: Record<string, { old: any; new: any }>;
    details?: string;
}

interface AuditTableProps {
    logs: AuditLog[];
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const AuditTable: React.FC<AuditTableProps> = ({
    logs,
    currentPage = 1,
    totalPages = 1,
    onPageChange
}) => {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const toggleRow = (id: string) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>Action</th>
                        <th>Actor</th>
                        <th>Target</th>
                        <th>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log) => (
                        <React.Fragment key={log.id}>
                            <tr
                                className={`${styles.row} ${expandedRow === log.id ? styles.expanded : ''}`}
                                onClick={() => toggleRow(log.id)}
                            >
                                <td className={styles.expandCell}>
                                    <svg
                                        className={`${styles.chevron} ${expandedRow === log.id ? styles.rotate : ''}`}
                                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    >
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                </td>
                                <td>
                                    <div className={styles.actionName}>{log.action}</div>
                                </td>
                                <td>
                                    <div className={styles.actorInfo}>
                                        <div className={styles.miniAvatar}>{getInitials(log.actor.name)}</div>
                                        <div className={styles.actorDetails}>
                                            <div className={styles.actorName}>{log.actor.name}</div>
                                            <div className={styles.actorEmail}>{log.actor.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.targetInfo}>
                                        <span className={styles.targetType}>{log.targetType}:</span>
                                        <span className={styles.targetName}>{log.target}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.timestamp}>{log.timestamp}</div>
                                </td>
                            </tr>
                            {expandedRow === log.id && (
                                <tr className={styles.detailRow}>
                                    <td colSpan={5}>
                                        <div className={styles.detailsContent}>
                                            <div className={styles.detailGrid}>
                                                <div className={styles.detailItem}>
                                                    <div className={styles.detailLabel}>IP Address</div>
                                                    <div className={styles.detailValue}>{log.ipAddress}</div>
                                                </div>
                                                <div className={styles.detailItem}>
                                                    <div className={styles.detailLabel}>User Agent</div>
                                                    <div className={styles.detailValue}>{log.userAgent}</div>
                                                </div>
                                            </div>

                                            {log.changes && (
                                                <div className={styles.changesSection}>
                                                    <div className={styles.changesTitle}>Changes</div>
                                                    <div className={styles.changesTable}>
                                                        {Object.entries(log.changes).map(([field, delta]) => (
                                                            <div key={field} className={styles.changeRow}>
                                                                <div className={styles.field}>{field}</div>
                                                                <div className={styles.from}>
                                                                    <span>From:</span>
                                                                    <code>{JSON.stringify(delta.old)}</code>
                                                                </div>
                                                                <div className={styles.to}>
                                                                    <span>To:</span>
                                                                    <code>{JSON.stringify(delta.new)}</code>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {log.details && (
                                                <div className={styles.additionalDetails}>
                                                    <div className={styles.detailLabel}>Details</div>
                                                    <div className={styles.detailValue}>{log.details}</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
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

export default AuditTable;
