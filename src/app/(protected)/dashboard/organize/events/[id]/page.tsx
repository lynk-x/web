"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatDate, formatTime, formatCurrency, formatNumber } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import Badge from '@/components/shared/Badge';
import type { BadgeVariant } from '@/types/shared';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import ProductTour from '@/components/dashboard/ProductTour';
import Spinner from '@/components/shared/Spinner';
import EmptyState from '@/components/shared/EmptyState';
import { getForumUrl } from '@/components/features/events/EventTable';
import EventCancellationModal from '@/components/features/events/EventCancellationModal';
import QuickLinksRow, { QuickLink } from '@/components/shared/QuickLinksRow';

interface TicketTier {
    id: string;
    display_name: string;
    price: number;
    capacity: number;
    tickets_sold: number;
    sale_starts_at: string | null;
    sale_ends_at: string | null;
    max_per_order: number | null;
}

interface EventDetail {
    id: string;
    title: string;
    description: string;
    status: string;
    starts_at: string;
    ends_at: string;
    timezone: string | null;
    location: any;
    media: any;
    is_private: boolean;
    currency: string;
    reference: string;
    forum_reference: string | null;
    created_at: string;
    ticket_tiers: TicketTier[];
    cancellation_reason: string | null;
}

const STATUS_BADGE_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
    draft: { label: 'Draft', variant: 'subtle' },
    published: { label: 'Published', variant: 'info' },
    active: { label: 'Active', variant: 'success' },
    completed: { label: 'Completed', variant: 'neutral' },
    cancelled: { label: 'Cancelled', variant: 'error' },
    suspended: { label: 'Suspended', variant: 'warning' },
};

export default function EventDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [event, setEvent] = useState<EventDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [revenueTotal, setRevenueTotal] = useState<number>(0);
    const [forumMemberCount, setForumMemberCount] = useState<number>(0);
    const [scanCount, setScanCount] = useState<number>(0);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

    const fetchEvent = useCallback(async () => {
        if (!id || !activeAccount) return;
        setIsLoading(true);
        try {
            const [{ data, error }, { data: analytics, error: analyticsError }] = await Promise.all([
                supabase.schema('api').rpc('get_organizer_event_details', {
                    p_account_id: activeAccount.id,
                    p_event_id: id,
                }),
                supabase.schema('api').rpc('get_event_analytics', { p_event_id: id }),
            ]);

            if (error) throw error;
            if (analyticsError) throw analyticsError;
            if (!data) {
                showToast('Event not found or access denied.', 'error');
                router.push('/dashboard/organize/events');
                return;
            }

            setEvent(data.event as EventDetail);
            setRevenueTotal(analytics?.gross_revenue || 0);
            setScanCount(analytics?.scan_count || 0);
            setForumMemberCount(analytics?.forum_members || 0);

            // Override ticket tiers from the RPC response
            setEvent(prev => prev ? { ...prev, ticket_tiers: data.tiers } : null);

        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load event details.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, activeAccount, supabase, showToast, router]);

    useEffect(() => { fetchEvent(); }, [fetchEvent]);

    const handleCancelEvent = async (reason: string) => {
        if (!event || !activeAccount) return;

        const { error } = await supabase.schema('api').rpc('cancel_event_full', {
            p_account_id: activeAccount.id,
            p_event_id: event.id,
            p_created_at: event.created_at,
            p_reason: reason,
        });

        if (error) throw error;

        showToast(`"${event.title}" has been cancelled and tickets were refunded.`, 'success');
        setIsCancelModalOpen(false);
        fetchEvent();
    };

    if (isLoading || !event) {
        return (
            <div className={adminStyles.container}>
                {isLoading ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <Spinner label="Loading event details..." />
                    </div>
                ) : (
                    <EmptyState message="Event not found." />
                )}
            </div>
        );
    }

    const tiers = event.ticket_tiers || [];
    const totalSold = tiers.reduce((s, t) => s + (t.tickets_sold || 0), 0);
    const totalCapacity = tiers.reduce((s, t) => s + (t.capacity || 0), 0);
    const sellThrough = totalCapacity > 0 ? ((totalSold / totalCapacity) * 100).toFixed(1) : '0';
    const badge = STATUS_BADGE_MAP[event.status] || { label: event.status, variant: 'neutral' as BadgeVariant };

    return (
        <div className={adminStyles.container}>
            <PageHeader
                title={event.title}
                subtitle={`${typeof window !== 'undefined' ? window.location.origin : ''}/event/${event.reference}`}
                closeHref="/dashboard/organize/events"
                badge={badge}
                primaryAction={{
                    label: 'Edit Event',
                    onClick: () => router.push(`/dashboard/organize/events/edit/${id}`),
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                }}
                secondaryAction={(event.status === 'active' || event.status === 'published') ? {
                    label: 'Cancel Event',
                    onClick: () => setIsCancelModalOpen(true),
                    className: adminStyles.btnDanger,
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                } : undefined}
            />

            {/* Stats Row */}
            <div className="tour-event-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <StatCard 
                    label="Tickets Sold" 
                    value={`${formatNumber(totalSold)} / ${formatNumber(totalCapacity)}`} 
                    change={`${sellThrough}% sell-through`}
                    trend={Number(sellThrough) >= 50 ? 'positive' : 'neutral'}
                />
                <StatCard 
                    label="Revenue" 
                    value={formatCurrency(revenueTotal, event.currency)} 
                    trend={revenueTotal > 0 ? 'positive' : 'neutral'}
                />
                <StatCard 
                    label="Check-ins" 
                    value={formatNumber(scanCount)} 
                    change={totalSold > 0 ? `${((scanCount / totalSold) * 100).toFixed(0)}% scanned` : undefined}
                />
                <StatCard 
                    label="Community" 
                    value={formatNumber(forumMemberCount)} 
                    change="forum members"
                />
            </div>

            {/* Quick Links */}
            <QuickLinksRow className="tour-event-links">
                {event.forum_reference && (
                    <QuickLink href={getForumUrl(event.forum_reference)} label="Open Forum" external />
                )}
                <QuickLink href={`/dashboard/organize/events/${id}/attendees`} label="View Attendees" />
                <QuickLink href={`/dashboard/organize/events/${id}/check-ins`} label="Check-in List" />
                <QuickLink href={`/dashboard/organize/analytics/event/${id}`} label="Analytics" />
            </QuickLinksRow>

            {/* Event Details Card */}
            <div className={adminStyles.pageCard} style={{ marginBottom: '24px' }}>
                <h2 className={adminStyles.sectionTitle}>Event Details</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    <DetailRow label="Reference" value={event.reference} />
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
                {event.description && (
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-interface-outline)' }}>
                        <p style={{ fontSize: '13px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</p>
                        <p style={{ fontSize: '14px', lineHeight: '1.6', opacity: 0.8, whiteSpace: 'pre-wrap' }}>{event.description}</p>
                    </div>
                )}
            </div>

            {/* Ticket Tiers */}
            <div className={`${adminStyles.pageCard} tour-event-tiers`}>
                <h2 className={adminStyles.sectionTitle}>Ticket Tiers</h2>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-interface-outline)', textAlign: 'left' }}>
                                <th style={thStyle}>Tier</th>
                                <th style={thStyle}>Price</th>
                                <th style={thStyle}>Sold</th>
                                <th style={thStyle}>Capacity</th>
                                <th style={thStyle}>Fill Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tiers.map(tier => {
                                const fill = tier.capacity > 0 ? ((tier.tickets_sold / tier.capacity) * 100).toFixed(0) : '0';
                                return (
                                    <tr key={tier.id} style={{ borderBottom: '1px solid var(--color-interface-outline)' }}>
                                        <td style={tdStyle}>{tier.display_name}</td>
                                        <td style={tdStyle}>{tier.price > 0 ? formatCurrency(tier.price, event.currency) : 'Free'}</td>
                                        <td style={tdStyle}>{formatNumber(tier.tickets_sold)}</td>
                                        <td style={tdStyle}>{formatNumber(tier.capacity)}</td>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                                    <div style={{ width: `${fill}%`, height: '100%', borderRadius: '3px', background: Number(fill) >= 90 ? 'var(--color-interface-error)' : 'var(--color-brand-primary)' }} />
                                                </div>
                                                <span style={{ opacity: 0.7, fontSize: '13px' }}>{fill}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {tiers.length === 0 && (
                                <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', opacity: 0.5 }}>No ticket tiers configured.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ProductTour
                storageKey={activeAccount ? `hasSeenEventDetailJoyride_${activeAccount.id}` : 'hasSeenEventDetailJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Event Intelligence',
                        content: 'This page provides real-time insights into your event performance. Track sales, revenue and attendee engagement from a single view.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-event-stats',
                        title: 'Performance Snapshot',
                        content: 'Monitor your critical KPIs including total ticket sales, gross revenue and forum community growth.',
                    },
                    {
                        target: '.tour-event-links',
                        title: 'Quick Management',
                        content: 'Jump directly to the attendee list, scanner interface or detailed event analytics.',
                    },
                    {
                        target: '.tour-event-tiers',
                        title: 'Tier Performance',
                        content: 'View a breakdown of pricing and fill rates for each ticket tier.',
                    }
                ]}
            />

            {isCancelModalOpen && (
                <EventCancellationModal
                    eventTitle={event.title}
                    eventId={event.id}
                    ticketsSold={totalSold}
                    onClose={() => setIsCancelModalOpen(false)}
                    onConfirm={handleCancelEvent}
                />
            )}
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

const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    opacity: 0.5,
    fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
    padding: '14px 16px',
};
