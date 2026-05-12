"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import { exportToCSV } from '@/utils/export';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import StatCard from '@/components/dashboard/StatCard';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import SubPageHeader from '@/components/shared/SubPageHeader';
import Modal from '@/components/shared/Modal';
import BulkActionsBar from '@/components/shared/BulkActionsBar';
import type { ActionItem } from '@/components/shared/TableRowActions';
import ProductTour from '@/components/dashboard/ProductTour';
import { useOrganization } from '@/context/OrganizationContext';

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
    const { id: eventId } = useParams() as { id: string };
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [logs, setLogs] = useState<CheckInLog[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<any>({ scanned: null, remaining: null, rejected: null });
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select(`
                    id, ticket_code, status, redeemed_at,
                    tier:ticket_tiers!ticket_tier_id(display_name),
                    buyer:user_profile!user_id(full_name, user_name),
                    scanner:user_profile!redeemed_by_id(full_name, user_name)
                `)
                .eq('event_id', eventId)
                .order('redeemed_at', { ascending: false, nullsFirst: false });

            if (error) throw error;

            const mappedLogs: CheckInLog[] = (data || []).map((row: any) => ({
                id: row.id,
                attendeeName: row.buyer?.full_name || row.buyer?.user_name || 'Anonymous',
                attendeeAvatar: null,
                ticketTier: row.tier?.display_name || 'Unknown Tier',
                status: row.status,
                scannedBy: row.scanner?.full_name || row.scanner?.user_name || 'System',
                timestamp: row.redeemed_at ? new Date(row.redeemed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—',
            });

            setLogs(mappedLogs);

            const scanned = mappedLogs.filter(l => l.status === 'used').length;
            const rejected = mappedLogs.filter(l => l.status === 'rejected').length;
            const valid = mappedLogs.filter(l => l.status === 'valid').length;
            setStats({
                scanned,
                remaining: valid,
                rejected,
            });

        } catch (err) {
            console.error('Error fetching check-ins:', err);
            showToast('Failed to load check-in logs', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, supabase, showToast]);

    useEffect(() => {
        fetchLogs();

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
        if (!manualCode.trim()) return;
        setIsVerifying(true);
        try {
            const { data, error } = await supabase.rpc('verify_and_use_ticket', {
                p_ticket_code: manualCode.trim(),
                p_event_id: eventId
            });

            if (error) throw error;

            const result = data[0];
            if (result.status === 'success') {
                showToast(`Verified! Welcome ${result.attendee_name}`, 'success');
                setShowManualModal(false);
                setManualCode('');
                fetchLogs();
            } else {
                showToast(result.message, 'error');
            }
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Verification failed', 'error');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleBulkCheckIn = async () => {
        if (selectedIds.size === 0) return;
        setIsVerifying(true);
        showToast(`Checking in ${selectedIds.size} attendees...`, 'info');
        try {
            const { data, error } = await supabase.rpc('bulk_check_in_tickets', {
                p_ticket_ids: Array.from(selectedIds)
            });
            if (error) throw error;
            showToast(`Successfully checked in ${data.processed_count} attendees.`, 'success');
            setSelectedIds(new Set());
            fetchLogs();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Bulk check-in failed', 'error');
        } finally {
            setIsVerifying(false);
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
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Check-in Logs"
                subtitle="Real-time scanner feed and manual entry logs for this event."
                backLabel="Back to Event"
                badge={{ label: 'Live Feed', variant: 'success' }}
                primaryAction={{
                    label: 'Manual Check-in',
                    onClick: () => setShowManualModal(true),
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                }}
                secondaryAction={{
                    label: 'Export CSV',
                    onClick: () => {
                        if (logs.length === 0) { showToast('No logs to export.', 'warning'); return; }
                        exportToCSV(logs.map(l => ({
                            attendee: l.attendeeName,
                            tier: l.ticketTier,
                            status: l.status,
                            scanned_by: l.scannedBy,
                            time: l.timestamp
                        })), `checkins_export_${eventId}`);
                        showToast('Export complete.', 'success');
                    },
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                }}
            />

            <BulkActionsBar
                selectedCount={selectedIds.size}
                onCancel={() => setSelectedIds(new Set())}
                actions={[
                    { label: 'Check-in Selected', onClick: handleBulkCheckIn, variant: 'default' }
                ]}
            />

            <div className={`${adminStyles.statsGrid} tour-checkin-stats`}>
                <StatCard label="Total Scanned" value={stats.scanned} color="var(--color-interface-success)" isLoading={isLoading} />
                <StatCard label="Remaining" value={stats.remaining} isLoading={isLoading} />
                <StatCard label="Rejected Scans" value={stats.rejected} color="var(--color-interface-error)" isLoading={isLoading} />
            </div>

            <div style={{ marginTop: '24px' }} className="tour-checkin-feed">
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

            <Modal
                isOpen={showManualModal}
                onClose={() => { setShowManualModal(false); setManualCode(''); }}
                title="Manual Check-in"
                size="small"
                footer={
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                            className={adminStyles.secondaryButton}
                            onClick={() => { setShowManualModal(false); setManualCode(''); }}
                        >
                            Cancel
                        </button>
                        <button
                            className={adminStyles.primaryButton}
                            onClick={handleManualCheckIn}
                            disabled={isVerifying || !manualCode.trim()}
                        >
                            {isVerifying ? 'Verifying...' : 'Verify & Check In'}
                        </button>
                    </div>
                }
            >
                <p style={{ margin: '0 0 16px', color: 'var(--color-text-secondary)', fontSize: 14 }}>
                    Enter the ticket code printed on the attendee&apos;s ticket (e.g. T-A3K9-10013).
                </p>
                <input
                    className={adminStyles.input}
                    placeholder="T-XXXX-NNNNN"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleManualCheckIn(); }}
                    autoFocus
                    style={{ fontFamily: 'monospace', letterSpacing: 2 }}
                />
            </Modal>
            <ProductTour
                storageKey={activeAccount ? `hasSeenEventCheckinsJoyride_${activeAccount.id}_${eventId}` : `hasSeenEventCheckinsJoyride_guest_${eventId}`}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Live Check-in Feed',
                        content: 'Monitor your event entrance in real-time. This feed updates automatically as staff scan tickets at the gate.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-checkin-stats',
                        title: 'Entry Progress',
                        content: 'Track total scans, remaining attendees and rejected tickets to manage gate flow effectively.',
                    },
                    {
                        target: '.tour-checkin-feed',
                        title: 'Verification Log',
                        content: 'Review individual scan details, including the staff member who performed the scan and the exact time of entry.',
                    }
                ]}
            />
        </div>
    );
}
