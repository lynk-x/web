"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';

import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/types/shared';
import { useRouter } from 'next/navigation';
import ReportTable from '@/components/admin/moderation/ReportTable';
import type { Report } from '@/types/admin';

// =============================================================================
// Types — aligned to the `support_tickets` DB table
// =============================================================================

/**
 * Mirrors the `support_tickets` table.
 * Priority and status values match the CHECK constraints in the schema.
 *
 * DB query (when wiring up):
 *   supabase.from('support_tickets')
 *     .select('*, requester:profiles!requester_id(display_name), assignee:profiles!assigned_to(display_name)')
 *     .order('created_at', { ascending: false })
 */
interface Ticket {
    id: string;
    /** Plain-text subject line of the ticket */
    subject: string;
    /** Display name of the user who raised the ticket */
    requester: string;
    /** Triage level: low | medium | high | critical */
    priority: 'low' | 'medium' | 'high' | 'critical';
    /** Lifecycle stage: open | in_progress | resolved | closed */
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    /** Display name of the assigned admin/staff member */
    assignedTo: string;
    /** Human-readable relative timestamp (e.g. "1 hour ago") */
    lastUpdated: string;
}

// =============================================================================
// Mock Data — 9 rows mirroring realistic support ticket scenarios
// Replace with a live Supabase query when integrating.
// =============================================================================
const mockTickets: Ticket[] = [
    { id: '1024', subject: 'Unable to withdraw funds', requester: 'Alice Walker', priority: 'high', status: 'open', assignedTo: 'John Doe', lastUpdated: '1 hour ago' },
    { id: '1023', subject: 'Event ticket not received after payment', requester: 'Bob Martinez', priority: 'high', status: 'in_progress', assignedTo: 'Jane Smith', lastUpdated: '3 hours ago' },
    { id: '1022', subject: 'Cannot update organizer profile photo', requester: 'Carol White', priority: 'medium', status: 'open', assignedTo: 'Unassigned', lastUpdated: '5 hours ago' },
    { id: '1021', subject: 'Ad campaign rejected without explanation', requester: 'Dave Lee', priority: 'medium', status: 'resolved', assignedTo: 'John Doe', lastUpdated: '1 day ago' },
    { id: '1020', subject: 'App crashes on iOS 17 on map screen', requester: 'Eve Chen', priority: 'critical', status: 'in_progress', assignedTo: 'Tech Team', lastUpdated: '2 days ago' },
    { id: '1019', subject: 'Incorrect tax rate shown at checkout', requester: 'Frank Brown', priority: 'medium', status: 'open', assignedTo: 'Unassigned', lastUpdated: '2 days ago' },
    { id: '1018', subject: 'Subscription renewal failed', requester: 'Grace Kim', priority: 'high', status: 'resolved', assignedTo: 'Jane Smith', lastUpdated: '3 days ago' },
    { id: '1017', subject: 'Forum posts not showing for my event', requester: 'Henry Adams', priority: 'low', status: 'closed', assignedTo: 'John Doe', lastUpdated: '5 days ago' },
    { id: '1016', subject: 'Two-factor authentication not working', requester: 'Isabella Scott', priority: 'high', status: 'open', assignedTo: 'Unassigned', lastUpdated: '1 week ago' },
];

/**
 * Mock data for the Moderation tab — aligned to `reports` DB table.
 *
 * `targetType` is derived from which of the three target FK columns is non-null:
 *   target_user_id → 'user', target_event_id → 'event', target_message_id → 'message'
 *
 * `status` uses `report_status` enum: pending | investigating | resolved | dismissed
 *
 * When wiring up:
 *   supabase.from('reports')
 *     .select('*, reporter:profiles!reporter_id(user_name), reason:report_reasons(category)')
 *     .order('created_at', { ascending: false })
 */
const mockReports: Report[] = [
    { id: 'r-1', targetType: 'user', targetId: 'u-1', title: 'Harassment in event chat', description: 'User sending threatening messages to attendees.', date: '1 hour ago', reporter: 'Alice Walker', status: 'pending', reasonId: 'harassment' },
    { id: 'r-2', targetType: 'event', targetId: 'e-2', title: 'Misleading event description', description: 'Event listed as free but charges at the door.', date: '3 hours ago', reporter: 'Bob Martinez', status: 'investigating', reasonId: 'false_listing' },
    { id: 'r-3', targetType: 'message', targetId: 'm-3', title: 'Spam messages in live chat', description: 'Bot-like account spamming referral links.', date: '5 hours ago', reporter: 'Carol White', status: 'pending', reasonId: 'spam' },
    { id: 'r-4', targetType: 'user', targetId: 'u-4', title: 'Impersonation of official account', description: 'Account pretending to be @lynkx_official.', date: '1 day ago', reporter: 'Dave Lee', status: 'resolved', reasonId: 'impersonation' },
    { id: 'r-5', targetType: 'event', targetId: 'e-5', title: 'Event cancelled, no refund issued', description: 'Organizer cancelled but kept ticket revenue.', date: '2 days ago', reporter: 'Eve Chen', status: 'investigating', reasonId: 'fraud' },
    { id: 'r-6', targetType: 'message', targetId: 'm-6', title: 'Hate speech in forum', description: 'Multiple slurs directed at a community group.', date: '3 days ago', reporter: 'Frank Brown', status: 'dismissed', reasonId: 'hate_speech' },
];

// =============================================================================
// Helpers
// =============================================================================

/** Status badge colours mapped to schema CHECK values */
const getStatusVariant = (status: Ticket['status']): BadgeVariant => {
    switch (status) {
        case 'open': return 'error';
        case 'in_progress': return 'warning';
        case 'resolved': return 'success';
        case 'closed': return 'subtle';
    }
};

/** Priority badge colours */
const getPriorityVariant = (priority: Ticket['priority']): BadgeVariant => {
    switch (priority) {
        case 'critical': return 'error';
        case 'high': return 'warning';
        case 'medium': return 'info';
        case 'low': return 'neutral';
    }
};

/** Derive key metrics from the current ticket list */
const getMetrics = (tickets: Ticket[]) => ({
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    critical: tickets.filter(t => t.priority === 'critical').length,
});

// =============================================================================
// Component
// =============================================================================

export default function SupportPage() {
    const { showToast } = useToast();
    const router = useRouter();

    // Top-level tab: tickets vs moderation reports
    const [activeTab, setActiveTab] = useState<'tickets' | 'moderation'>('tickets');

    // ── Tickets State ─────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // ── Reports (Moderation) State ─────────────────────────────────
    const [reportSearchTerm, setReportSearchTerm] = useState('');
    const [reportStatusFilter, setReportStatusFilter] = useState('all');
    const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
    const [reportPage, setReportPage] = useState(1);
    const reportsPerPage = 5;

    // Filter reports — report_status enum: pending | investigating | resolved | dismissed
    const filteredReports = mockReports.filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
            r.reporter.toLowerCase().includes(reportSearchTerm.toLowerCase());
        const matchesStatus = reportStatusFilter === 'all' || r.status === reportStatusFilter;
        return matchesSearch && matchesStatus;
    });
    const reportTotalPages = Math.ceil(filteredReports.length / reportsPerPage);
    const paginatedReports = filteredReports.slice(
        (reportPage - 1) * reportsPerPage,
        reportPage * reportsPerPage
    );

    useEffect(() => { setReportPage(1); setSelectedReportIds(new Set()); }, [reportSearchTerm, reportStatusFilter]);

    // ── Filter Logic ────────────────────────────────────────────────────────

    const filteredTickets = mockTickets.filter(ticket => {
        const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.requester.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
    });

    // ── Pagination ───────────────────────────────────────────────────────────

    const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
    const paginatedTickets = filteredTickets.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page + selection when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedTicketIds(new Set());
    }, [searchTerm, statusFilter, priorityFilter]);

    // ── Selection Logic ──────────────────────────────────────────────────────

    const handleSelectTicket = (id: string) => {
        const next = new Set(selectedTicketIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedTicketIds(next);
    };

    const handleSelectAll = () => {
        if (selectedTicketIds.size === paginatedTickets.length) {
            setSelectedTicketIds(new Set());
        } else {
            setSelectedTicketIds(new Set(paginatedTickets.map(t => t.id)));
        }
    };

    // ── Bulk Actions ─────────────────────────────────────────────────────────

    const handleBulkAssign = () => {
        showToast(`Assigning ${selectedTicketIds.size} ticket(s)…`, 'info');
        setTimeout(() => { showToast('Tickets assigned.', 'success'); setSelectedTicketIds(new Set()); }, 1000);
    };

    const handleBulkResolve = () => {
        showToast(`Resolving ${selectedTicketIds.size} ticket(s)…`, 'info');
        setTimeout(() => { showToast('Tickets marked resolved.', 'success'); setSelectedTicketIds(new Set()); }, 1000);
    };

    const handleBulkClose = () => {
        showToast(`Closing ${selectedTicketIds.size} ticket(s)…`, 'info');
        setTimeout(() => { showToast('Tickets closed.', 'success'); setSelectedTicketIds(new Set()); }, 1000);
    };

    const bulkActions: BulkAction[] = [
        { label: 'Assign', onClick: handleBulkAssign, variant: 'default' },
        { label: 'Resolve', onClick: handleBulkResolve, variant: 'success' },
        { label: 'Close', onClick: handleBulkClose, variant: 'danger' },
    ];

    // ── Table Columns ────────────────────────────────────────────────────────

    const columns: Column<Ticket>[] = [
        {
            header: 'Subject',
            render: (ticket) => (
                <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>#{ticket.id} — {ticket.subject}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '2px' }}>Raised by {ticket.requester}</div>
                </div>
            )
        },
        {
            header: 'Priority',
            render: (ticket) => (
                <Badge label={ticket.priority.toUpperCase()} variant={getPriorityVariant(ticket.priority)} />
            )
        },
        {
            header: 'Status',
            // Maps to CHECK constraint: open | in_progress | resolved | closed
            render: (ticket) => (
                <Badge label={ticket.status.replace('_', ' ').toUpperCase()} variant={getStatusVariant(ticket.status)} showDot />
            )
        },
        {
            header: 'Assigned To',
            render: (ticket) => (
                <div style={{ fontSize: '13px', opacity: ticket.assignedTo === 'Unassigned' ? 0.4 : 0.9 }}>
                    {ticket.assignedTo}
                </div>
            )
        },
        {
            header: 'Last Updated',
            render: (ticket) => <div style={{ fontSize: '13px', opacity: 0.7 }}>{ticket.lastUpdated}</div>
        },
    ];

    // ── Row Actions ──────────────────────────────────────────────────────────

    const getRowActions = (ticket: Ticket): ActionItem[] => [
        {
            label: 'View Ticket',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
            onClick: () => router.push(`/dashboard/admin/support/${ticket.id}`),
        },
        {
            label: ticket.status === 'resolved' || ticket.status === 'closed' ? 'Reopen' : 'Mark Resolved',
            variant: ticket.status === 'resolved' || ticket.status === 'closed' ? 'default' : 'success',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
            onClick: () => showToast(`Toggling status for ticket #${ticket.id}`, 'info'),
        },
        {
            label: 'Assign to Me',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
            onClick: () => showToast(`Assigning ticket #${ticket.id} to you`, 'info'),
        },
    ];

    // ── Metrics ──────────────────────────────────────────────────────────────

    const metrics = getMetrics(mockTickets);

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className={styles.container}>
            <header className={adminStyles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: '1 1 auto' }}>
                    <h1 className={adminStyles.title}>Support &amp; Safety</h1>
                    <p className={adminStyles.subtitle}>
                        Manage support tickets raised by users and staff. Content moderation is handled by forum moderators.
                    </p>
                </div>
                {activeTab === 'tickets' && (
                    <button
                        className={adminStyles.btnPrimary}
                        onClick={() => router.push('/dashboard/admin/support/create')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        New Ticket
                    </button>
                )}
            </header>

            {/* Sub-nav: Support Tickets | Moderation Reports */}
            <div className={adminStyles.tabs}>
                <button
                    className={`${adminStyles.tab} ${activeTab === 'tickets' ? adminStyles.tabActive : ''}`}
                    onClick={() => setActiveTab('tickets')}
                >Support Tickets</button>
                <button
                    className={`${adminStyles.tab} ${activeTab === 'moderation' ? adminStyles.tabActive : ''}`}
                    onClick={() => setActiveTab('moderation')}
                >
                    Moderation Reports
                    {mockReports.filter(r => r.status === 'pending').length > 0 && (
                        <span style={{ marginLeft: 6, background: 'rgba(239,68,68,0.25)', color: '#f87171', borderRadius: 32, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>
                            {mockReports.filter(r => r.status === 'pending').length}
                        </span>
                    )}
                </button>
            </div>

            {/* ── Key Metrics ─────────────────────────────────────────── */}
            <div className={adminStyles.statsGrid}>
                <div className={adminStyles.statCard}>
                    <span className={adminStyles.statLabel}>Open Tickets</span>
                    <div className={adminStyles.statValue} style={{ color: '#e57373' }}>{metrics.open}</div>
                </div>
                <div className={adminStyles.statCard}>
                    <span className={adminStyles.statLabel}>In Progress</span>
                    <div className={adminStyles.statValue} style={{ color: '#fdd835' }}>{metrics.inProgress}</div>
                </div>
                <div className={adminStyles.statCard}>
                    <span className={adminStyles.statLabel}>Resolved</span>
                    <div className={adminStyles.statValue} style={{ color: '#81c784' }}>{metrics.resolved}</div>
                </div>
                <div className={adminStyles.statCard}>
                    <span className={adminStyles.statLabel}>Critical Priority</span>
                    <div className={adminStyles.statValue} style={{ color: '#ff5252' }}>{metrics.critical}</div>
                </div>
                <div className={adminStyles.statCard}>
                    {/* Pending reports from the `reports` table — report_status = 'pending' */}
                    <span className={adminStyles.statLabel}>Pending Reports</span>
                    <div className={adminStyles.statValue} style={{ color: '#fdd835' }}>
                        {mockReports.filter(r => r.status === 'pending').length}
                    </div>
                </div>
            </div>

            {/* ── Support Tickets Tab ──────────────────────────────────── */}
            {activeTab === 'tickets' && (<>

                {/* ── Toolbar ──────────────────────────────────────────────── */}
                <TableToolbar
                    searchPlaceholder="Search tickets by subject or requester…"
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                >
                    {/* Status filter — maps to schema CHECK values */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[
                            { value: 'all', label: 'All Reports' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'investigating', label: 'Investigating' },
                            { value: 'resolved', label: 'Resolved' },
                            { value: 'dismissed', label: 'Dismissed' },
                        ].map(({ value, label }) => (
                            <button
                                key={value}
                                className={`${adminStyles.chip} ${reportStatusFilter === value ? adminStyles.chipActive : ''}`}
                                onClick={() => { setReportStatusFilter(value); setReportPage(1); }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Priority filter — maps to schema CHECK values */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[
                            { value: 'all', label: 'All Priority' },
                            { value: 'critical', label: '🔴 Critical' },
                            { value: 'high', label: '🟠 High' },
                            { value: 'medium', label: '🟡 Medium' },
                            { value: 'low', label: '🟢 Low' },
                        ].map(({ value, label }) => (
                            <button
                                key={value}
                                className={`${adminStyles.chip} ${priorityFilter === value ? adminStyles.chipActive : ''}`}
                                onClick={() => setPriorityFilter(value)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </TableToolbar>

                {/* ── Bulk Actions ─────────────────────────────────────────── */}
                <BulkActionsBar
                    selectedCount={selectedTicketIds.size}
                    actions={bulkActions}
                    onCancel={() => setSelectedTicketIds(new Set())}
                    itemTypeLabel="tickets"
                />

                {/* ── Table ────────────────────────────────────────────────── */}
                <DataTable<Ticket>
                    data={paginatedTickets}
                    columns={columns}
                    getActions={getRowActions}
                    selectedIds={selectedTicketIds}
                    onSelect={handleSelectTicket}
                    onSelectAll={handleSelectAll}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    emptyMessage="No support tickets found matching current filters."
                />
            </>)
            }

            {/* ── Moderation Reports Tab ── backed by `reports` table + report_status enum ── */}
            {
                activeTab === 'moderation' && (
                    <>
                        <TableToolbar
                            searchPlaceholder="Search by title or reporter..."
                            searchValue={reportSearchTerm}
                            onSearchChange={setReportSearchTerm}
                        >
                            {/* report_status enum filter chips */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {[
                                    { value: 'all', label: 'All' },
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'investigating', label: 'Investigating' },
                                    { value: 'resolved', label: 'Resolved' },
                                    { value: 'dismissed', label: 'Dismissed' },
                                ].map(({ value, label }) => (
                                    <button
                                        key={value}
                                        className={`${adminStyles.chip} ${reportStatusFilter === value ? adminStyles.chipActive : ''}`}
                                        onClick={() => setReportStatusFilter(value)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </TableToolbar>
                        <BulkActionsBar
                            selectedCount={selectedReportIds.size}
                            actions={[
                                { label: 'Begin Investigation', onClick: () => { showToast(`Investigating ${selectedReportIds.size} reports...`, 'info'); setTimeout(() => { showToast('Reports marked as investigating.', 'info'); setSelectedReportIds(new Set()); }, 1000); }, variant: 'default' },
                                { label: 'Dismiss Selected', onClick: () => { showToast(`Dismissing ${selectedReportIds.size} reports...`, 'info'); setTimeout(() => { showToast('Reports dismissed.', 'warning'); setSelectedReportIds(new Set()); }, 1000); }, variant: 'danger' },
                            ]}
                            onCancel={() => setSelectedReportIds(new Set())}
                            itemTypeLabel="reports"
                        />
                        <ReportTable
                            reports={paginatedReports}
                            selectedIds={selectedReportIds}
                            onSelect={(id) => {
                                const next = new Set(selectedReportIds);
                                next.has(id) ? next.delete(id) : next.add(id);
                                setSelectedReportIds(next);
                            }}
                            onSelectAll={() => {
                                if (selectedReportIds.size === paginatedReports.length) {
                                    setSelectedReportIds(new Set());
                                } else {
                                    setSelectedReportIds(new Set(paginatedReports.map(r => r.id)));
                                }
                            }}
                            currentPage={reportPage}
                            totalPages={reportTotalPages}
                            onPageChange={setReportPage}
                        />
                    </>
                )
            }
        </div >
    );
}
