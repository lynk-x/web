"use client";

import { useState } from 'react';
import styles from './page.module.css';
import Link from 'next/link';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/components/shared/TableRowActions';

interface CheckInLog {
    id: string;
    attendeeName: string;
    ticketTier: string;
    status: 'scanned' | 'rejected' | 'manual_entry';
    scannedBy: string;
    timestamp: string;
}

const mockLogs: CheckInLog[] = [
    { id: 'log-1', attendeeName: 'John Doe', ticketTier: 'VIP Access', status: 'scanned', scannedBy: 'Gate 1 Scanner', timestamp: '14:23:45' },
    { id: 'log-2', attendeeName: 'Alice Smith', ticketTier: 'General Admission', status: 'scanned', scannedBy: 'Gate 2 Scanner', timestamp: '14:25:10' },
    { id: 'log-3', attendeeName: 'Unknown', ticketTier: 'Invalid Code', status: 'rejected', scannedBy: 'Gate 1 Scanner', timestamp: '14:26:05' },
    { id: 'log-4', attendeeName: 'Sarah Jenkins', ticketTier: 'Early Bird', status: 'manual_entry', scannedBy: 'Admin (Bob)', timestamp: '14:30:12' },
    { id: 'log-5', attendeeName: 'Mike Ross', ticketTier: 'VIP Access', status: 'scanned', scannedBy: 'VIP Entrance', timestamp: '14:35:00' },
];

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'scanned': return 'success';
        case 'manual_entry': return 'warning';
        case 'rejected': return 'error';
        default: return 'neutral';
    }
};

const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'scanned': return 'Valid Scan';
        case 'manual_entry': return 'Manual Check-in';
        case 'rejected': return 'Rejected';
        default: return status;
    }
};

export default function CheckInLogsPage() {
    const { showToast } = useToast();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleSelect = (id: string) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === mockLogs.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(mockLogs.map(l => l.id)));
    };

    const columns: Column<CheckInLog>[] = [
        {
            header: 'Time',
            render: (log) => <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)' }}>{log.timestamp}</span>
        },
        {
            header: 'Attendee',
            render: (log) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500 }}>{log.attendeeName}</span>
                    <span style={{ fontSize: '13px', opacity: 0.6 }}>{log.ticketTier}</span>
                </div>
            )
        },
        {
            header: 'Status',
            render: (log) => <Badge label={getStatusLabel(log.status)} variant={getStatusVariant(log.status)} showDot />
        },
        {
            header: 'Scanner/Staff',
            render: (log) => <span style={{ fontSize: '13px', opacity: 0.8 }}>{log.scannedBy}</span>
        }
    ];

    const getActions = (log: CheckInLog): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'View Ticket Details',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => showToast(`Opening ticket details for ${log.attendeeName}`, 'info')
            }
        ];

        if (log.status !== 'rejected') {
            actions.push({
                label: 'Undo Check-in',
                variant: 'danger',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3zM15 9l-6 6m0-6l6 6" /></svg>,
                onClick: () => showToast(`Check-in undone for ${log.attendeeName}`, 'warning')
            });
        }

        return actions;
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ flex: '1 1 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <Link href="/dashboard/organize/events" className={styles.backLink}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                            Back to Events
                        </Link>
                        <Badge label="Live Feed" variant="success" showDot />
                    </div>
                    <h1 className={styles.title}>Check-in Logs</h1>
                    <p className={styles.subtitle}>Real-time scanner feed and manual entry logs for this event.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className={styles.btnSecondary} onClick={() => showToast('Exporting logs to CSV...', 'info')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Export CSV
                    </button>
                    <button className={styles.btnPrimary} onClick={() => showToast('Opening manual entry modal...', 'info')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        Manual Check-in
                    </button>
                </div>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Scanned</span>
                    <span className={styles.statValue} style={{ color: 'var(--color-success)' }}>1,420</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Remaining</span>
                    <span className={styles.statValue}>580</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Rejected Scans</span>
                    <span className={styles.statValue} style={{ color: 'var(--color-error)' }}>12</span>
                </div>
            </div>

            <DataTable<CheckInLog>
                data={mockLogs}
                columns={columns}
                getActions={getActions}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                emptyMessage="No scans recorded yet."
            />
        </div>
    );
}
