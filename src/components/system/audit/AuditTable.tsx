"use client";

import React, { useState } from 'react';
import styles from './AuditTable.module.css';
import Pagination from '../../shared/Pagination';
import { getInitials } from '@/utils/format';

export type { AuditLog } from '@/types/admin';
import type { AuditLog } from '@/types/admin';

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
                                            </div>

                                            {log.changes && (
                                                <div className={styles.changesSection}>
                                                    <div className={styles.changesTitle}>Changes</div>
                                                    <div className={styles.changesGrid}>
                                                        {Object.entries(log.changes).map(([field, delta]) => (
                                                            <div key={field} className={styles.changeCard}>
                                                                <div className={styles.fieldName}>{field.replace(/_/g, ' ')}</div>
                                                                <div className={styles.diffWrapper}>
                                                                    <div className={styles.oldValue}>
                                                                        <span className={styles.diffLabel}>WAS</span>
                                                                        <pre className={styles.diffPre}>
                                                                            {typeof delta.old === 'object' ? JSON.stringify(delta.old, null, 2) : String(delta.old ?? 'null')}
                                                                        </pre>
                                                                    </div>
                                                                    <div className={styles.diffArrow}>→</div>
                                                                    <div className={styles.newValue}>
                                                                        <span className={styles.diffLabel}>NOW</span>
                                                                        <pre className={styles.diffPre}>
                                                                            {typeof delta.new === 'object' ? JSON.stringify(delta.new, null, 2) : String(delta.new ?? 'null')}
                                                                        </pre>
                                                                    </div>
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
