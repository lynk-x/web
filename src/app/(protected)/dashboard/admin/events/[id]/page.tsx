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
import Button from '@/components/shared/Button';
import type { BadgeVariant } from '@/types/shared';
import QuickLinksRow, { QuickLink, CopyableLinkChip } from '@/components/shared/QuickLinksRow';
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
    description: string;
    timezone: string | null;
    is_private: boolean;
    currency: string;
    cancellation_reason: string | null;
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
 * organizer account owns it. Sub-areas (ticketing, attendees, revenue,
 * moderation queue) are real sub-routes rather than client-side tabs,
 * matching the organizer dashboard's event detail layout. Forum/chat
 * moderation and communications live inline on this page's right column
 * rather than as their own sub-route.
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
    const [forumReference, setForumReference] = useState<string | null>(null);
    const [reportCount, setReportCount] = useState(0);
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
            setForumReference(forumRow?.reference || null);

            const { count } = await supabase
                .schema('api')
                .from('v1_reports')
                .select('id', { count: 'exact', head: true })
                .eq('target_event_id', id);
            setReportCount(count || 0);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load event details.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, eventCreatedAt, supabase, showToast, router]);

    useEffect(() => { fetchEvent(); }, [fetchEvent]);

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

    const handleResendForumInvites = async () => {
        if (!event) return;
        if (!await confirm(
            `Resend the forum-join notification to every current member of "${event.title}"'s forum?`,
            { title: 'Resend Forum Invites' }
        )) return;

        showToast(`Resending forum invites for ${event.title}...`, 'info');
        try {
            const { data, error } = await supabase.schema('api').rpc('admin_resend_forum_invites', {
                p_event_id: event.id,
                p_event_created_at: event.created_at,
            });
            if (error) throw error;

            if (data?.failed > 0) {
                showToast(`Resent to ${data.sent} member(s); ${data.failed} failed — check server logs.`, 'warning');
            } else {
                showToast(`Forum invites resent to ${data?.sent ?? 0} member(s) for ${event.title}`, 'success');
            }
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to resend forum invites.', 'error');
        }
    };

    const handleModerateEvent = async (status: 'suspended' | 'published', label: string, message: string) => {
        if (!event) return;
        if (!await confirm(message, { title: label })) return;

        try {
            const { error } = await supabase.schema('api').rpc('moderate_event', {
                p_event_id: event.id,
                p_created_at: event.created_at,
                p_status: status,
                p_reason: `${label} by platform admin`,
            });
            if (error) throw error;
            showToast(`"${event.title}" is now ${status}.`, 'success');
            fetchEvent();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || `Failed to ${label.toLowerCase()}.`, 'error');
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
    const currency = tiers[0]?.currency || event.currency || 'USD';

    // Resolve event cover image URL from available media metadata
    const eventImage = (event.media as Record<string, unknown> | null)?.cover_image_url as string | undefined
        || (event.media as Record<string, unknown> | null)?.thumbnail_url as string | undefined
        || (event.media as Record<string, unknown> | null)?.thumbnail as string | undefined
        || (event.media as Record<string, unknown> | null)?.poster as string | undefined;

    const subpageQuery = eventCreatedAt ? `?created_at=${encodeURIComponent(eventCreatedAt)}` : '';

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
                <StatCard label="Reports" value={formatNumber(reportCount)} trend={reportCount > 0 ? 'negative' : 'positive'} />
            </div>

            <QuickLinksRow>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <QuickLink href={`/dashboard/admin/events/${id}/ticketing${subpageQuery}`} label="Manage Tickets" />
                    <QuickLink href={`/dashboard/admin/events/${id}/attendees${subpageQuery}`} label="View Attendees" />
                    <QuickLink href={`/dashboard/admin/events/${id}/revenue${subpageQuery}`} label="Track Revenue" />
                    <QuickLink href={`/dashboard/admin/events/${id}/moderation${subpageQuery}`} label="Moderation" />
                </div>
                <CopyableLinkChip
                    label="EVENT LINK"
                    href={`/event/${event.reference}`}
                    url={`${typeof window !== 'undefined' ? window.location.origin : ''}/event/${event.reference}`}
                />
            </QuickLinksRow>

            <div className={adminStyles.subPageGrid}>
                {/* Left Column: Event Details & Communications */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className={adminStyles.pageCard}>
                        <h2 className={adminStyles.sectionTitle}>Event Details</h2>

                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            <div style={{ flex: '1 1 300px', maxWidth: '360px', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--color-interface-outline)' }}>
                                {eventImage ? (
                                    <img
                                        src={eventImage}
                                        alt={event.title}
                                        style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '100%',
                                        aspectRatio: '16/9',
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                                            <circle cx="9" cy="9" r="2"/>
                                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                                        </svg>
                                        <span style={{ fontSize: '13px', opacity: 0.4 }}>No cover image configured</span>
                                    </div>
                                )}
                            </div>

                            <div style={{ flex: '2 1 320px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                    <DetailRow label="Reference" value={event.reference} />
                                    <DetailRow label="Organizer" value={event.organizer} />
                                    <DetailRow label="Visibility" value={event.is_private ? 'Private (invite only)' : 'Public'} />
                                    <DetailRow label="Start" value={`${formatDate(event.starts_at)} at ${formatTime(event.starts_at)}`} />
                                    <DetailRow label="End" value={event.ends_at ? `${formatDate(event.ends_at)} at ${formatTime(event.ends_at)}` : 'Not set'} />
                                    <DetailRow label="Timezone" value={event.timezone || 'Etc/UTC'} />
                                    <DetailRow label="Currency" value={event.currency} />
                                    <DetailRow label="Created" value={formatDate(event.created_at)} />
                                    {event.cancellation_reason && (
                                        <DetailRow label="Cancellation Reason" value={event.cancellation_reason} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {event.description && (
                            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-interface-outline)' }}>
                                <p style={{ fontSize: '13px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</p>
                                <p style={{ fontSize: '14px', lineHeight: '1.6', opacity: 0.8, whiteSpace: 'pre-wrap' }}>{event.description}</p>
                            </div>
                        )}

                        {(event.status === 'active' || event.status === 'published' || event.status === 'suspended') && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-interface-outline)' }}>
                                {(event.status === 'active' || event.status === 'published') && (
                                    <Button
                                        variant="danger"
                                        onClick={() => handleModerateEvent(
                                            'suspended',
                                            'Suspend Event',
                                            `Suspend "${event.title}"? It will be hidden from public listings without cancelling tickets or issuing refunds — reversible via Reinstate.`
                                        )}
                                    >
                                        Suspend Event
                                    </Button>
                                )}
                                {event.status === 'suspended' && (
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleModerateEvent(
                                            'published',
                                            'Reinstate Event',
                                            `Reinstate "${event.title}" and make it publicly visible again?`
                                        )}
                                    >
                                        Reinstate Event
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Community Forum & Communications */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {forumReference && (
                        <div className={adminStyles.pageCard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-brand-primary)' }}>
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                    Community Forum
                                </h3>
                                <p style={{ fontSize: '13px', opacity: 0.6, margin: '8px 0 0', lineHeight: '1.5' }}>
                                    View this event&apos;s forum — chat, updates, media and moderation, the same workspace attendees use.
                                </p>
                            </div>

                            <a
                                href={getForumUrl(forumReference)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={adminStyles.btnPrimary}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', textDecoration: 'none', height: '38px', fontSize: '13px', borderRadius: '8px' }}
                            >
                                Open Forum
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="7" y1="17" x2="17" y2="7"></line>
                                    <polyline points="7 7 17 7 17 17"></polyline>
                                </svg>
                            </a>
                        </div>
                    )}

                    <div className={adminStyles.pageCard}>
                        <h3 style={{ marginTop: 0 }}>Communications</h3>
                        <p style={{ opacity: 0.6, fontSize: '13px', marginBottom: '12px' }}>
                            Resend the ticket purchase confirmation email to every buyer of this event — e.g. after fixing a template issue that affected an already-sent batch.
                        </p>
                        <Button variant="secondary" onClick={handleResendTicketConfirmations}>
                            Resend Ticket Confirmations
                        </Button>
                        {forumReference && (
                            <>
                                <p style={{ opacity: 0.6, fontSize: '13px', margin: '16px 0 12px' }}>
                                    Resend the &quot;you&apos;re in the forum&quot; notification to every current forum member — separate from the ticket email above, since forum membership already exists by this point.
                                </p>
                                <Button variant="secondary" onClick={handleResendForumInvites}>
                                    Resend Forum Invites
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Helper Components ──────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{value}</span>
        </div>
    );
}
