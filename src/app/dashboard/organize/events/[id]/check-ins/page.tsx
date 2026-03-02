"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { ActionItem } from '@/components/shared/TableRowActions';

interface CheckInLog {
    id: string;
    attendeeName: string;
    attendeeAvatar: string | null;
    ticketTier: string;
    status: 'valid' | 'used' | 'cancelled' | 'rejected' | 'manual_entry';
    scannedBy: string;
    timestamp: string;
}

export default function CheckInLogsPage() {
    const { id: eventId } = useParams();
    const { showToast } = useToast();
    const supabase = createClient();

    const [logs, setLogs] = useState<CheckInLog[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ scanned: 0, remaining: 0, rejected: 0 });

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch from vw_attendees_list (Phase 18 View)
            const { data, error } = await supabase
                .from('vw_attendees_list')
                .select('*')
                .eq('event_id', eventId)
                .order('purchase_date', { ascending: false });

            if (error) throw error;

            const mappedLogs: CheckInLog[] = (data || []).map(row => ({
                id: row.ticket_id,
                attendeeName: row.attendee_name || 'Anonymous',
                attendeeAvatar: null, // Would require join with profiles avatar
                ticketTier: row.tier_name,
                status: row.ticket_status,
                scannedBy: 'System', // This should come from a redeemed_by join
                timestamp: new Date(row.purchase_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }));

            setLogs(mappedLogs);

            // Calc Stats
            const scanned = mappedLogs.filter(l => l.status === 'used').length;
            setStats({
                scanned,
                remaining: mappedLogs.length - scanned,
                rejected: 0 // Fetch from a separate error log table if exists
            });

        } catch (err) {
            console.error("Error fetching check-ins:", err);
            showToast("Failed to load check-in logs", "error");
        } finally {
            setIsLoading(false);
        }
    }, [eventId, supabase, showToast]);

    useEffect(() => {
        fetchLogs();

        // Real-time subscription
        const channel = supabase
            .channel(`event-scans-${eventId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tickets',
                filter: `event_id=eq.${eventId}`
            }, () => {
                fetchLogs();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [eventId, fetchLogs, supabase]);

    const handleManualCheckIn = async () => {
        const code = window.prompt("Enter Ticket Code:");
        if (!code) return;

        showToast("Verifying ticket...", "info");

        try {
            const { data, error } = await supabase.rpc('verify_and_use_ticket', {
                p_ticket_code: code,
                p_event_id: eventId
            });

            if (error) throw error;

            const result = data[0]; // Function returns a table row
            if (result.status === 'success') {
                showToast(`Verified! Welcome ${result.attendee_name}`, "success");
                fetchLogs();
            } else {
                showToast(result.message, "error");
            }
        } catch (err: any) {
            showToast(err.message || "Verification failed", "error");
        }
    };

    const getStatusVariant = (status: string): BadgeVariant => {
        switch (status) {
            case 'used': return 'success';
            case 'valid': return 'warning';
            case 'rejected': return 'error';
            default: return 'neutral';
        }
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
            render: (log) => <Badge label={log.status === 'used' ? 'Valid Scan' : log.status} variant={getStatusVariant(log.status)} showDot />
        },
        {
            header: 'Scanner/Staff',
            render: (log) => <span style={{ fontSize: '13px', opacity: 0.8 }}>{log.scannedBy}</span>
        }
    ];

    const getActions = (log: CheckInLog): ActionItem[] => [
        {
            label: 'View Ticket Details',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
            onClick: () => showToast(`Opening ticket details for ${log.attendeeName}`, 'info')
        }
    ];

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
                    <button className={styles.btnPrimary} onClick={handleManualCheckIn}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        Manual Check-in
                    </button>
                </div>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Scanned</span>
                    <span className={styles.statValue} style={{ color: 'var(--color-success)' }}>{stats.scanned}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Remaining</span>
                    <span className={styles.statValue}>{stats.remaining}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Rejected Scans</span>
                    <span className={styles.statValue} style={{ color: 'var(--color-error)' }}>{stats.rejected}</span>
                </div>
            </div>

            <DataTable<CheckInLog>
                data={logs}
                columns={columns}
                getActions={getActions}
                selectedIds={selectedIds}
                onSelect={(id) => {
                    const next = new Set(selectedIds);
                    next.has(id) ? next.delete(id) : next.add(id);
                    setSelectedIds(next);
                }}
                onSelectAll={() => {
                    if (selectedIds.size === logs.length) setSelectedIds(new Set());
                    else setSelectedIds(new Set(logs.map(l => l.id)));
                }}
                isLoading={isLoading}
                emptyMessage="No attendees found for this event."
            />
        </div>
    );
}
