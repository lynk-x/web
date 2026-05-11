"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatDate, formatTime, formatCurrency, formatNumber } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import SubPageHeader from '@/components/shared/SubPageHeader';
import Badge from '@/components/shared/Badge';
import type { BadgeVariant } from '@/types/shared';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import ProductTour from '@/components/dashboard/ProductTour';

interface TicketTier {
    id: string;
    name: string;
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

    const fetchEvent = useCallback(async () => {
        if (!id || !activeAccount) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_organizer_event_details', {
                p_account_id: activeAccount.id,
                p_event_id: id
            });

            if (error) throw error;
            if (!data) {
                showToast('Event not found or access denied.', 'error');
                router.push('/dashboard/organize/events');
                return;
            }

            setEvent(data.event as EventDetail);
            setRevenueTotal(data.stats.revenue || 0);
            setScanCount(data.stats.scans || 0);
            setForumMemberCount(data.stats.community || 0);
            
            // Override ticket tiers from the RPC response
            setEvent(prev => prev ? { ...prev, ticket_tiers: data.tiers } : null);

        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load event details.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, activeAccount, supabase, showToast, router]);

    useEffect(() => { fetchEvent(); }, [fetchEvent]);

    if (isLoading || !event) {
        return (
            <div className={adminStyles.container}>
                <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
                    {isLoading ? 'Loading event details...' : 'Event not found.'}
                </div>
            </div>
        );
    }

    const tiers = event.ticket_tiers || [];
    const totalSold = tiers.reduce((s, t) => s + (t.tickets_sold || 0), 0);
    const totalCapacity = tiers.reduce((s, t) => s + (t.capacity || 0), 0);
    const sellThrough = totalCapacity > 0 ? ((totalSold / totalCapacity) * 100).toFixed(1) : '0';
    const badge = STATUS_BADGE_MAP[event.status] || { label: event.status, variant: 'neutral' as BadgeVariant };
    const locationName = event.location?.name || 'TBD';

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title={event.title}
                subtitle={`${locationName} \u00B7 ${formatDate(event.starts_at)} at ${formatTime(event.starts_at)}`}
                backLabel="Back to Events"
                badge={badge}
                primaryAction={{
                    label: 'Edit Event',
                    onClick: () => router.push(`/dashboard/organize/events/edit/${id}`),
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                }}
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
            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }} className="tour-event-links">
                <QuickLink href={`/dashboard/organize/events/${id}/attendees`} label="View Attendees" />
                <QuickLink href={`/dashboard/organize/events/${id}/check-ins`} label="Check-in Scanner" />
                <QuickLink href={`/dashboard/organize/analytics/event/${id}`} label="Analytics" />
            </div>

            {/* Ticket Tiers */}
            <div className={`${adminStyles.pageCard} tour-event-tiers`} style={{ marginBottom: '24px' }}>
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
                                <th style={thStyle}>Sale Window</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tiers.map(tier => {
                                const fill = tier.capacity > 0 ? ((tier.tickets_sold / tier.capacity) * 100).toFixed(0) : '0';
                                return (
                                    <tr key={tier.id} style={{ borderBottom: '1px solid var(--color-interface-outline)' }}>
                                        <td style={tdStyle}>{tier.name}</td>
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
                                        <td style={{ ...tdStyle, opacity: 0.6, fontSize: '13px' }}>
                                            {tier.sale_starts_at ? formatDate(tier.sale_starts_at) : 'Open'} — {tier.sale_ends_at ? formatDate(tier.sale_ends_at) : 'Event start'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {tiers.length === 0 && (
                                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', opacity: 0.5 }}>No ticket tiers configured.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Event Details Card */}
            <div className={adminStyles.pageCard}>
                <h2 className={adminStyles.sectionTitle}>Event Details</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    <DetailRow label="Reference" value={event.reference} />
                    <DetailRow label="Visibility" value={event.is_private ? 'Private (invite only)' : 'Public'} />
                    <DetailRow label="Start" value={`${formatDate(event.starts_at)} at ${formatTime(event.starts_at)}`} />
                    <DetailRow label="End" value={event.ends_at ? `${formatDate(event.ends_at)} at ${formatTime(event.ends_at)}` : 'Not set'} />
                    <DetailRow label="Timezone" value={event.timezone || 'UTC'} />
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

            <ProductTour
                storageKey={activeAccount ? `hasSeenEventDetailJoyride_${activeAccount.id}_${id}` : `hasSeenEventDetailJoyride_guest_${id}`}
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
                        content: 'View a breakdown of fill rates and sales windows for each ticket tier.',
                    }
                ]}
            />
        </div>
    );
}

// ── Helper Components ──────────────────────────────────────────────────────

function QuickLink({ href, label }: { href: string; label: string }) {
    return (
        <Link
            href={href}
            style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-interface-outline)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-utility-primaryText)',
                textDecoration: 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
            }}
        >
            {label}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </Link>
    );
}

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
