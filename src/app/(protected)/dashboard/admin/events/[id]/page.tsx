"use client";

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { formatDate, formatTime, formatCurrency, formatNumber } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import Spinner from '@/components/shared/Spinner';
import EmptyState from '@/components/shared/EmptyState';
import Badge from '@/components/shared/Badge';
import Button from '@/components/shared/Button';
import type { BadgeVariant } from '@/types/shared';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import TicketingTab from '@/components/admin/events/ticketing/TicketingTab';
import ForumMessagesTab from '@/components/admin/forums/ForumMessagesTab';
import ReportTable from '@/components/admin/moderation/ReportTable';
import DataTable, { Column } from '@/components/shared/DataTable';
import type { Report } from '@/types/admin';
import { getForumUrl } from '@/components/features/events/EventTable';

interface EventDetail {
    id: string;
    title: string;
    reference: string;
    status: string;
    account_id: string;
    organizer: string;
    starts_at: string;
    ends_at: string | null;
    location: Record<string, unknown> | null;
    media: Record<string, unknown> | null;
    tags: string[];
    created_at: string;
}

interface TierRow {
    id: string;
    name: string;
    price: number;
    quantity: number;
    sold: number;
    currency: string;
}

interface AttendeeRow {
    id: string;
    ticket_id: string;
    ticket_code: string;
    status: string;
    created_at: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    tier_name: string;
    purchased_price: number | null;
    purchased_currency: string | null;
}

const STATUS_BADGE_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
    draft: { label: 'Draft', variant: 'subtle' },
    published: { label: 'Published', variant: 'info' },
    active: { label: 'Active', variant: 'success' },
    completed: { label: 'Completed', variant: 'neutral' },
    cancelled: { label: 'Cancelled', variant: 'error' },
    suspended: { label: 'Suspended', variant: 'warning' },
};

/**
 * Admin event detail control panel — the admin-scoped counterpart to the
 * organizer event detail page, built entirely on admin-gated RPCs so any
 * platform admin can inspect/act on any event regardless of which
 * organizer account owns it.
 */
export default function AdminEventDetailPage(props: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div className={adminStyles.container}><Spinner label="Loading event details..." centered /></div>}>
            <AdminEventDetailContent {...props} />
        </Suspense>
    );
}

function AdminEventDetailContent({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const eventCreatedAt = searchParams.get('created_at');
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const supabase = useMemo(() => createClient(), []);

    const [event, setEvent] = useState<EventDetail | null>(null);
    const [tiers, setTiers] = useState<TierRow[]>([]);
    const [grossRevenue, setGrossRevenue] = useState(0);
    const [forumId, setForumId] = useState<string | null>(null);
    const [forumReference, setForumReference] = useState<string | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
    const [isAttendeesLoading, setIsAttendeesLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEvent = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!eventCreatedAt) {
                showToast('Missing event reference — please open this page from the events list.', 'error');
                router.push('/dashboard/admin/events');
                return;
            }

            const { data, error } = await supabase.schema('api').rpc('get_admin_event_details', {
                p_event_id: id,
                p_event_created_at: eventCreatedAt,
            });
            if (error) throw error;
            if (!data) {
                showToast('Event not found.', 'error');
                router.push('/dashboard/admin/events');
                return;
            }

            setEvent(data.event as EventDetail);
            setTiers((data.tiers || []) as TierRow[]);
            setGrossRevenue(data.finances?.gross_revenue || 0);

            const { data: forumRow } = await supabase
                .schema('api')
                .from('v1_forums')
                .select('id, reference')
                .eq('event_id', id)
                .maybeSingle();
            setForumId(forumRow?.id || null);
            setForumReference(forumRow?.reference || null);

            const { data: reportRows } = await supabase
                .schema('api')
                .from('v1_reports')
                .select('*')
                .eq('target_event_id', id);
            setReports((reportRows || []).map((r: Record<string, unknown>) => ({
                id: r.id as string,
                targetType: 'event',
                targetId: r.target_event_id as string,
                title: (r.reason_display_name as string) || `Report #${(r.id as string).slice(0, 8)}`,
                description: (r.info as Record<string, unknown>)?.description as string || 'No description provided.',
                date: new Date(r.created_at as string).toLocaleDateString(),
                reporter: (r.reporter_username as string) || 'Anonymous',
                status: (r.status === 'under_investigation' ? 'investigating' : r.status) as Report['status'],
                createdAt: r.created_at as string,
                reasonId: r.reason_id as string,
            })));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load event details.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, eventCreatedAt, supabase, showToast, router]);

    const fetchAttendees = useCallback(async () => {
        if (!event) return;
        setIsAttendeesLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('get_admin_event_attendees', {
                p_event_id: id,
                p_created_at: event.created_at,
                p_limit: 100,
                p_offset: 0,
            });
            if (error) throw error;
            const items = (data?.items || []) as Omit<AttendeeRow, 'id'>[];
            setAttendees(items.map((a) => ({ ...a, id: a.ticket_id })));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load attendees.', 'error');
        } finally {
            setIsAttendeesLoading(false);
        }
    }, [id, event, supabase, showToast]);

    useEffect(() => { fetchEvent(); }, [fetchEvent]);
    useEffect(() => { fetchAttendees(); }, [fetchAttendees]);

    const handleResendTicketConfirmations = async () => {
        if (!event) return;
        if (!await confirm(
            `Resend the ticket confirmation email to every buyer of "${event.title}"? This bypasses each buyer's email notification preference.`,
            { title: 'Resend Ticket Confirmations' }
        )) return;

        showToast(`Resending ticket confirmations for ${event.title}...`, 'info');
        try {
            const { data, error } = await supabase.schema('api').rpc('admin_resend_ticket_confirmations', {
                p_event_id: event.id,
                p_event_created_at: event.created_at,
            });
            if (error) throw error;

            if (data?.failed > 0) {
                showToast(`Resent to ${data.sent} buyer(s); ${data.failed} failed — check server logs.`, 'warning');
            } else {
                showToast(`Ticket confirmations resent to ${data?.sent ?? 0} buyer(s) for ${event.title}`, 'success');
            }
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to resend ticket confirmations.', 'error');
        }
    };

    const handleCancelEvent = async () => {
        if (!event) return;
        if (!await confirm(
            `Cancel "${event.title}" and refund every ticket holder? This cannot be undone.`,
            { title: 'Cancel Event' }
        )) return;

        try {
            const { error } = await supabase.schema('api').rpc('cancel_event_full', {
                p_account_id: event.account_id,
                p_event_id: event.id,
                p_created_at: event.created_at,
                p_reason: 'Cancelled by platform admin',
            });
            if (error) throw error;
            showToast(`"${event.title}" has been cancelled and tickets were refunded.`, 'success');
            fetchEvent();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to cancel event.', 'error');
        }
    };

    if (isLoading || !event) {
        return (
            <div className={adminStyles.container}>
                {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%' }}>
                        <Spinner label="Loading event details..." centered />
                    </div>
                ) : (
                    <EmptyState message="Event not found." />
                )}
            </div>
        );
    }

    const totalSold = tiers.reduce((s, t) => s + (t.sold || 0), 0);
    const totalCapacity = tiers.reduce((s, t) => s + (t.quantity || 0), 0);
    const sellThrough = totalCapacity > 0 ? ((totalSold / totalCapacity) * 100).toFixed(1) : '0';
    const badge = STATUS_BADGE_MAP[event.status] || { label: event.status, variant: 'neutral' as BadgeVariant };
    const currency = tiers[0]?.currency || 'USD';

    const attendeeColumns: Column<AttendeeRow>[] = [
        {
            header: 'Attendee',
            render: (a) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{a.full_name || 'Unknown'}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{a.email}</div>
                </div>
            ),
        },
        { header: 'Ticket Code', render: (a) => <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{a.ticket_code}</span> },
        { header: 'Tier', render: (a) => a.tier_name },
        {
            header: 'Price Paid',
            render: (a) => a.purchased_price != null ? formatCurrency(a.purchased_price, a.purchased_currency || currency) : '—',
        },
        {
            header: 'Status',
            render: (a) => <Badge label={a.status.toUpperCase()} variant={a.status === 'valid' ? 'success' : a.status === 'used' ? 'info' : 'subtle'} showDot />,
        },
        { header: 'Purchased', render: (a) => formatDate(a.created_at) },
    ];

    return (
        <div className={adminStyles.container}>
            {ConfirmDialog}
            <PageHeader
                title={event.title}
                subtitle={`Organized by ${event.organizer} — admin oversight view.`}
                closeHref="/dashboard/admin/events"
                badge={badge}
                primaryAction={{
                    label: 'Edit Event',
                    onClick: () => router.push(`/dashboard/admin/events/${id}/edit`),
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
                }}
                secondaryAction={(event.status === 'active' || event.status === 'published') ? {
                    label: 'Cancel Event',
                    onClick: handleCancelEvent,
                    className: adminStyles.btnSecondary,
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
                } : undefined}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <StatCard
                    label="Tickets Sold"
                    value={`${formatNumber(totalSold)} / ${formatNumber(totalCapacity)}`}
                    change={`${sellThrough}% sell-through`}
                    trend={Number(sellThrough) >= 50 ? 'positive' : 'neutral'}
                />
                <StatCard label="Revenue" value={formatCurrency(grossRevenue, currency)} trend={grossRevenue > 0 ? 'positive' : 'neutral'} />
                <StatCard label="Attendees" value={formatNumber(totalSold)} />
                <StatCard label="Reports" value={formatNumber(reports.length)} trend={reports.length > 0 ? 'negative' : 'positive'} />
            </div>

            <Tabs defaultValue="overview">
                <TabsList style={{ width: 'fit-content' }}>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="ticketing">Ticketing & Resale</TabsTrigger>
                    <TabsTrigger value="attendees">Attendees</TabsTrigger>
                    <TabsTrigger value="community">Forum & Chat</TabsTrigger>
                    <TabsTrigger value="moderation">Moderation Queue</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <div className={adminStyles.subPageGrid}>
                        <div className={adminStyles.pageCard}>
                            <h3 style={{ marginTop: 0 }}>Basic Information</h3>
                            <p><strong>Reference:</strong> {event.reference}</p>
                            <p><strong>Organizer:</strong> {event.organizer}</p>
                            <p><strong>Start:</strong> {formatDate(event.starts_at)} at {formatTime(event.starts_at)}</p>
                            <p><strong>End:</strong> {event.ends_at ? `${formatDate(event.ends_at)} at ${formatTime(event.ends_at)}` : 'Not set'}</p>
                        </div>
                        <div className={adminStyles.pageCard}>
                            <h3 style={{ marginTop: 0 }}>Communications</h3>
                            <p style={{ opacity: 0.6, fontSize: '13px', marginBottom: '12px' }}>
                                Resend the ticket purchase confirmation email to every buyer of this event — e.g. after fixing a template issue that affected an already-sent batch.
                            </p>
                            <Button variant="secondary" onClick={handleResendTicketConfirmations}>
                                Resend Ticket Confirmations
                            </Button>
                        </div>
                        {forumReference && (
                            <div className={adminStyles.pageCard}>
                                <h3 style={{ marginTop: 0 }}>Community Forum</h3>
                                <a href={getForumUrl(forumReference)} target="_blank" rel="noopener noreferrer" className={adminStyles.btnPrimary} style={{ display: 'inline-flex', textDecoration: 'none' }}>
                                    Open Forum
                                </a>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="ticketing">
                    <TicketingTab eventId={event.id} />
                </TabsContent>

                <TabsContent value="attendees">
                    <DataTable<AttendeeRow>
                        data={attendees}
                        columns={attendeeColumns}
                        isLoading={isAttendeesLoading}
                        emptyMessage="No attendees have purchased tickets for this event yet."
                    />
                </TabsContent>

                <TabsContent value="community">
                    {forumId ? (
                        <ForumMessagesTab forumId={forumId} />
                    ) : (
                        <div className={adminStyles.emptyState}>No forum exists for this event.</div>
                    )}
                </TabsContent>

                <TabsContent value="moderation">
                    <ReportTable reports={reports} isLoading={isLoading} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
